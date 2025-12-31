import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { parseStringPromise } from 'xml2js';
import qs from 'qs';
import FormData from 'form-data';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import {
  IReporterOptions,
  MasterRecordListOptions,
  LoginResult,
  UpdateReportOptions,
  DocumentDetail,
  SimpleClusterUpdate,
  CreateDocumentOptions,
  GetDefinitionListOptions,
} from './types';
import { convertDocumentToXml, generatePartialUpdateXml, buildCreateDocumentXml } from './xmlUtils';

export class IReporterNode {
  private domain: string;
  private username?: string;
  private password?: string;
  private sessionId?: string;
  private client: AxiosInstance;

  constructor(options: IReporterOptions) {
    this.domain = options.domain.replace(/\/$/, ''); // Remove trailing slash
    this.username = options.username;
    this.password = options.password;
    this.client = axios.create({
      baseURL: `${this.domain}/ConMasAPI/Rests/APIExecute.aspx`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0, // Prevent following redirects automatically if needed, though usually fine
    });
  }

  private async parseXml(xml: string): Promise<any> {
    try {
      const result = await parseStringPromise(xml, { explicitArray: false });
      return result;
    } catch (error) {
      throw new Error(`Failed to parse XML response: ${error}`);
    }
  }

  public async login(): Promise<void> {
    if (!this.username || !this.password) {
      throw new Error('Username and password are required for login.');
    }

    const body = qs.stringify({
      command: 'Login',
      user: this.username,
      password: this.password,
    });

    try {
      const response = await this.client.post('', body);
      const data = response.data; // This might be XML string or object depending on axios config, but usually string for XML types unless transformed

      // Check for success code in XML
      const json: LoginResult = await this.parseXml(data);
      if (json?.conmas?.loginResult?.code !== '0') {
        throw new Error(`Login failed: ${json?.conmas?.loginResult?.remark || 'Unknown error'}`);
      }

      // Extract cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const sessionCookie = cookies.find((c: string) => c.startsWith('ASP.NET_SessionId'));
        if (sessionCookie) {
          this.sessionId = sessionCookie.split(';')[0];
        }
      }

      if (!this.sessionId) {
        throw new Error('Login successful but failed to retrieve session ID.');
      }
    } catch (error: any) {
      throw new Error(`Login request failed: ${error.message}`);
    }
  }

  public async logout(): Promise<void> {
    if (!this.sessionId && !this.username) {
      return;
    }

    const body = qs.stringify({
      command: 'Logout',
    });

    try {
      const headers: Record<string, string> = {};
      if (this.sessionId) {
        headers['Cookie'] = this.sessionId;
      }
      await this.client.post('', body, { headers });
    } catch (error) {
      // Best effort logout, ignore errors
      console.warn('Logout failed or session already invalid');
    } finally {
      this.sessionId = undefined;
    }
  }

  private async execute(command: string, params: Record<string, string>): Promise<any> {
    try {
      if (!this.sessionId && this.username && this.password) {
        await this.login();
      } else if (!this.sessionId) {
        throw new Error('No session ID and no credentials provided.');
      }

      const body = qs.stringify({
        command,
        ...params,
      });

      const headers: Record<string, string> = {};
      if (this.sessionId) {
        headers['Cookie'] = this.sessionId;
      }

      const response = await this.client.post('', body, { headers });
      const json = await this.parseXml(response.data);
      return json;
    } catch (error: any) {
      throw new Error(`Command ${command} failed: ${error.message}`);
    } finally {
      if (this.sessionId) {
        await this.logout();
      }
    }
  }

  public async getDocumentDetail(options: { topId: string }): Promise<any> {
    return this.execute('GetReportDetail', { topId: options.topId });
  }

  public async getReportList(): Promise<any> {
    return this.execute('GetReportList', {});
  }

  public async getMasterRecordList(options: MasterRecordListOptions): Promise<any> {
    // Map options to string record, filtering undefined
    const params: Record<string, string> = {
      masterId: options.masterId,
    };
    if (options.masterKey) params.masterKey = options.masterKey;
    if (options.recordId) params.recordId = options.recordId;
    if (options.recordKey) params.recordKey = options.recordKey;
    if (options.fieldSearch) params.fieldSearch = options.fieldSearch;

    return this.execute('GetMasterRecordList', params);
  }

  public async updateReport(
    options: UpdateReportOptions,
    documentDetail?: DocumentDetail | SimpleClusterUpdate[]
  ): Promise<any> {
    try {
      if (!this.sessionId && !(this.username && this.password)) {
        throw new Error('No session ID and no credentials provided.');
      }

      await this.login(); // Ensure logged in

      let content = options.dataFile;
      let type = options.type || 'xml'; // Default to xml if not specified

      if (typeof content !== 'string' && !Buffer.isBuffer(content) && documentDetail) {
        if (type === 'xml') {
          if (Array.isArray(documentDetail)) {
            // Simplified Update
            if (!options.topId) {
              throw new Error(
                'topId is required in options when using simplified cluster updates.'
              );
            }
            content = generatePartialUpdateXml(
              options.topId,
              documentDetail as SimpleClusterUpdate[],
              options.updateUser,
              options.topName
            );

            // Check if any update has an image OR needs a generated QR code
            // Criteria for QR: value="4" (Approved) and no approvalSignImage provided
            const updatesWithImages = (documentDetail as SimpleClusterUpdate[]).filter(
              (u) => u.approvalSignImage || (u.value === '4' && !u.approvalSignImage)
            );

            if (updatesWithImages.length > 0) {
              // We need to zip
              const zip = new AdmZip();

              // Process images/QR codes concurrently
              await Promise.all(
                updatesWithImages.map(async (update) => {
                  if (update.approvalSignImage) {
                    // ... existing file logic ...
                    const fileName = update.approvalSignImage.split(/[\\/]/).pop();
                    if (fileName) {
                      try {
                        // Check if file exists to avoid crash
                        if (fs.existsSync(update.approvalSignImage)) {
                          const fileContent = fs.readFileSync(update.approvalSignImage);
                          zip.addFile(fileName, fileContent);
                        } else {
                          console.warn(`Image file not found: ${update.approvalSignImage}`);
                        }
                      } catch (e: any) {
                        console.error(
                          `Failed to read image file ${update.approvalSignImage}: ${e.message}`
                        );
                      }
                    }
                  } else if (update.value === '4') {
                    // Generate QR Code
                    // Format: user_formid_timestamp
                    const user = update.approver || options.updateUser || 'unknown';
                    const formId = options.topId || 'unknown';
                    const timestamp =
                      update.approvalDate ||
                      new Date().toISOString().split('T')[0].replace(/-/g, '/'); // Default to today yyyy/MM/dd or just use Date.now()
                    // User said: user_formid_timestamp
                    // Let's use a clear timestamp
                    const ts = Date.now().toString();
                    const qrContent = `${user}_${formId}_${ts}`;
                    const qrFileName = `qr_${update.clusterId}_${ts}.png`;

                    try {
                      const buffer = await QRCode.toBuffer(qrContent);
                      zip.addFile(qrFileName, buffer);
                      // Updates the update object so xmlUtils picks it up
                      update.approvalSignImage = qrFileName;
                    } catch (e) {
                      console.error('Failed to generate QR code', e);
                    }
                  }
                })
              );

              // Regenerate XML because we might have modified approvalSignImage references
              content = generatePartialUpdateXml(
                options.topId,
                documentDetail as SimpleClusterUpdate[],
                options.updateUser,
                options.topName
              );

              zip.addFile('import.xml', Buffer.from(content, 'utf8'));
              content = zip.toBuffer();
              type = 'xmlZip';
            }
          } else {
            // Standard Full Document mode
            content = convertDocumentToXml(documentDetail as DocumentDetail);
          }
        } else {
          throw new Error(`Unsupported update type: ${type}. Only 'xml' is supported.`);
        }
      }

      if (!content) {
        throw new Error(
          'Data file content is required (either via options.dataFile or derived from documentDetail)'
        );
      }

      const form = new FormData();
      form.append('command', 'UpdateReport');
      form.append('type', type);

      const filename = 'upload.xml';
      const contentType = 'text/xml';

      form.append('dataFile', content, {
        filename: filename,
        contentType: contentType,
      });
      form.append('encoding', options.encoding || 'UTF-8');
      form.append('mode', options.mode !== undefined ? options.mode.toString() : '0'); // Default 0

      // Optional parameters
      if (options.updateUser) form.append('updateUser', options.updateUser);
      if (options.isCabonCopy !== undefined)
        form.append('isCabonCopy', options.isCabonCopy.toString());
      if (options.isCompulsive !== undefined)
        form.append('isCompulsive', options.isCompulsive.toString());
      if (options.thumbnailUpdate !== undefined)
        form.append('thumbnailUpdate', options.thumbnailUpdate.toString());
      if (options.userMode !== undefined) form.append('userMode', options.userMode.toString());
      if (options.labelMode !== undefined) form.append('labelMode', options.labelMode.toString());

      const headers: Record<string, string> = {
        ...form.getHeaders(),
      };
      if (this.sessionId) {
        headers['Cookie'] = this.sessionId;
      }

      // We use axios directly here because execute() assumes x-www-form-urlencoded and simple body
      const response = await this.client.post('', form, { headers });
      const json = await this.parseXml(response.data);
      return json;
    } catch (error: any) {
      throw new Error(`UpdateReport failed: ${error.message}`);
    } finally {
      if (this.sessionId) {
        await this.logout();
      }
    }
  }
  public async createDocument(options: CreateDocumentOptions): Promise<any> {
    try {
      if (!this.sessionId && !(this.username && this.password)) {
        throw new Error('No session ID and no credentials provided.');
      }

      await this.login();

      const type = options.type || 'xml';
      let content = options.dataFile;

      if (!content) {
        if (type === 'xml') {
          content = buildCreateDocumentXml(options);
        } else {
          // For xmlZip, the user usually provides the zip content directly or we could implement zip generation if needed.
          // But for now, if dataFile is missing and type is xmlZip, we can't easily auto-generate unless we have images.
          // If the user wants to just create a doc with XML inside a zip (maybe for size?), we could zip the XML.
          // Given the requirements, let's assume if it's xmlZip without dataFile, we zip the generated XML.
          const xmlContent = buildCreateDocumentXml(options);
          const zip = new AdmZip();
          zip.addFile('import.xml', Buffer.from(xmlContent, 'utf8'));
          content = zip.toBuffer();
        }
      }

      const form = new FormData();
      form.append('command', 'AutoGenerate');
      form.append('type', type);

      const filename = type === 'xmlZip' ? 'upload.zip' : 'upload.xml';
      const contentType = type === 'xmlZip' ? 'application/zip' : 'text/xml';

      form.append('dataFile', content, {
        filename: filename,
        contentType: contentType,
      });

      form.append('encoding', options.encoding || 'UTF-8');

      if (options.userMode !== undefined) {
        form.append('userMode', options.userMode.toString());
      }

      // AutoGenerate doesn't seem to use other flags like mode, isCabonCopy etc based on the description,
      // but if they were needed we would add them.
      // The description specifically mentions command, type, dataFile, userMode.

      const headers: Record<string, string> = {
        ...form.getHeaders(),
      };
      if (this.sessionId) {
        headers['Cookie'] = this.sessionId;
      }

      const response = await this.client.post('', form, { headers });
      const json = await this.parseXml(response.data);
      return json;
    } catch (error: any) {
      throw new Error(`AutoGenerate failed: ${error.message}`);
    } finally {
      if (this.sessionId) {
        await this.logout();
      }
    }
  }

  public async getFormList(options: GetDefinitionListOptions = {}): Promise<any> {
    const params: Record<string, string> = {};

    // Map options to API parameters
    if (options.labelId !== undefined) params.labelId = options.labelId.toString();
    if (options.itemTargetLabel !== undefined)
      params.itemTargetLabel = options.itemTargetLabel.toString();
    if (options.itemTargetSheet !== undefined)
      params.itemTargetSheet = options.itemTargetSheet.toString();
    if (options.itemTargetSet !== undefined)
      params.itemTargetSet = options.itemTargetSet.toString();
    if (options.itemTargetBook !== undefined)
      params.itemTargetBook = options.itemTargetBook.toString();
    if (options.publicStatus !== undefined) params.publicStatus = options.publicStatus.toString();
    if (options.word) params.word = options.word;
    if (options.wordTargetName !== undefined)
      params.wordTargetName = options.wordTargetName.toString();
    if (options.wordTargetRemarks !== undefined)
      params.wordTargetRemarks = options.wordTargetRemarks.toString();
    if (options.History !== undefined) params.History = options.History.toString();
    if (options.systemKey1) params.systemKey1 = options.systemKey1;
    if (options.systemKey2) params.systemKey2 = options.systemKey2;
    if (options.systemKey3) params.systemKey3 = options.systemKey3;
    if (options.systemKey4) params.systemKey4 = options.systemKey4;
    if (options.systemKey5) params.systemKey5 = options.systemKey5;
    if (options.uriSchemeMode !== undefined)
      params.uriSchemeMode = options.uriSchemeMode.toString();

    return this.execute('GetDefinitionList', params);
  }
}
