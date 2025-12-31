export interface IReporterOptions {
  domain: string;
  username?: string;
  password?: string;
}

export interface MasterRecordListOptions {
  masterId: string;
  masterKey?: string;
  recordId?: string;
  recordKey?: string;
  fieldSearch?: string;
}

export interface LoginResult {
  conmas: {
    loginResult: {
      code: string; // "0" is success
      remark?: string;
      [key: string]: any;
    };
  };
}

export interface Cluster {
  name: string;
  value: string;
  sheetNo: string; // XML seems to have it as string/number usually string in JSON from xml2js
  clusterId: string;
  [key: string]: any;
}

export interface DetailInfo {
  topId: string;
  topName: string;
  reportType?: string;
  registTime?: string;
  registUser?: string;
  updateTime?: string;
  updateUser?: string;
  publicStatus?: string;
  sheetCount: string;
  editStatus?: string;
  remarksName1?: string;
  remarksName2?: string;
  remarksName3?: string;
  remarksName4?: string;
  remarksName5?: string;
  remarksName6?: string;
  remarksName7?: string;
  remarksName8?: string;
  remarksName9?: string;
  remarksName10?: string;
  remarksValue1?: string;
  remarksValue2?: string;
  remarksValue3?: string;
  remarksValue4?: string;
  remarksValue5?: string;
  remarksValue6?: string;
  remarksValue7?: string;
  remarksValue8?: string;
  remarksValue9?: string;
  remarksValue10?: string;
  systemKey1?: string;
  systemKey2?: string;
  systemKey3?: string;
  systemKey4?: string;
  systemKey5?: string;
  clusters?: {
    cluster: Cluster[] | Cluster;
  };
  approval?: {
    cluster: Cluster[] | Cluster;
  };
  [key: string]: any;
}

export interface DocumentDetail {
  conmas: {
    detailInfo: DetailInfo;
  };
}

export interface UpdateReportOptions {
  type?: 'xml' | 'xmlZip'; // Default xml. CSV types removed.
  dataFile?: string | Buffer; // If not provided, constructed from (documentDetail | SimpleClusterUpdate[])
  encoding?: string; // Default UTF-8
  mode?: number; // 0: Normal, 1: Force
  topId?: string; // Required if using SimpleClusterUpdate[], otherwise derived from documentDetail
  topName?: string; // Optional, used for systemKey5 generation in simplified updates
  updateUser?: string;
  isCabonCopy?: number;
  isCompulsive?: number;
  thumbnailUpdate?: number;
  userMode?: number;
  labelMode?: number; // 1: remove all labels
}

export interface SimpleClusterUpdate {
  clusterId: string;
  value: string;
  sheetNo?: string; // Default to '1' if omitted
  approver?: string;
  approvalDate?: string;
  approverComment?: string;
  approvalSignImage?: string; // Path to image file for custom seal
}

export interface ClusterData {
  sheetNo?: number | string;
  clusterId: string | number;
  value: string | number;
}

export interface SheetData {
  sheetNo: number | string;
  clusters: ClusterData[];
}

export interface CreateDocumentOptions {
  defTopId: string | number;
  repTopName?: string;
  createUserId?: string;
  createRoleMode?: number | string; // 1 or 0
  systemKey1?: string;
  systemKey2?: string;
  systemKey3?: string;
  systemKey4?: string;
  systemKey5?: string;
  sheets?: SheetData[];

  // Base options
  type?: 'xml' | 'xmlZip';
  dataFile?: string | Buffer; // Usually generated
  encoding?: string;
  userMode?: number; // 0: API User, 1: createUserId
}

export interface GetDefinitionListOptions {
  labelId?: string | number; // Default -9 (all)
  itemTargetLabel?: boolean; // Default true
  itemTargetSheet?: boolean; // Default true
  itemTargetSet?: boolean; // Default true
  itemTargetBook?: boolean; // Default true
  publicStatus?: number; // 1: Test, 2: Published. Default All? API says "All/1/2". Let's assume undefined = All.
  word?: string;
  wordTargetName?: boolean; // Default false
  wordTargetRemarks?: boolean; // Default false
  History?: boolean; // Default false
  systemKey1?: string;
  systemKey2?: string;
  systemKey3?: string;
  systemKey4?: string;
  systemKey5?: string;
  uriSchemeMode?: number; // -1: No auth, 2: Include login auth.
}

export interface DefinitionItem {
  type: string; // 0: Label, 1: Sheet, 2: Set, 3: Book
  itemId: string;
  name: string;
  iconId?: string;
  dispRemarks?: string;
  displayNumber?: string;
  editStatus?: string;
  itemOrg?: string;
  revNo?: string;
  current?: string;
  mobileSave?: string;
  registTime?: string;
  updateTime?: string;
  urlScheme?: string;
  systemKey1?: string;
  systemKey2?: string;
  [key: string]: any;
}

export interface DefinitionListResult {
  conmas: {
    items: {
      item: DefinitionItem[] | DefinitionItem;
    };
  };
}
