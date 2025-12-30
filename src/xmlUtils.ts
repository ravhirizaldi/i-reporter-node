import { Builder } from 'xml2js';
import { DocumentDetail, Cluster, SimpleClusterUpdate, CreateDocumentOptions } from './types';

export function buildCreateDocumentXml(options: CreateDocumentOptions): string {
  const sheets: any[] = [];

  if (options.sheets) {
    options.sheets.forEach((sheetData) => {
      const xmlClusters = sheetData.clusters.map((c) => ({
        sheetNo: c.sheetNo || sheetData.sheetNo,
        clusterId: c.clusterId,
        value: c.value,
      }));

      sheets.push({
        sheetNo: sheetData.sheetNo,
        clusters: {
          cluster: xmlClusters,
        },
      });
    });
  }

  const top: any = {
    defTopId: options.defTopId,
    repTopName: options.repTopName,
    createUserId: options.createUserId,
    createRoleMode: options.createRoleMode,
    systemKey1: options.systemKey1,
    sheets: sheets.length > 0 ? { sheet: sheets } : undefined,
  };

  const xmlObj = {
    conmas: {
      top: top,
    },
  };

  const builder = new Builder({
    rootName: 'root',
    headless: false,
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
  });

  return builder.buildObject(xmlObj);
}

export function convertDocumentToXml(detail: DocumentDetail): string {
  const info = detail.conmas.detailInfo;

  // Construct the object structure for XML
  // Matches schema:
  // <conmas>
  //   <top>
  //     <repTopId>...</repTopId>
  //     ...
  //     <sheets>
  //       <sheet>...</sheet>
  //     </sheets>
  //   </top>
  // </conmas>

  // Helper to handle partial updates
  const valOrIgnore = (v: any) => (v === undefined || v === null ? '(ignore)' : String(v));

  const top: any = {
    repTopId: info.topId,
    editStatus: info.editStatus || '1',
    repTopName: valOrIgnore(info.topName),
    createUserId: valOrIgnore(info.updateUser), // Spec: createUserId is used for Update User ID in Update API

    // System Keys
    systemKey1: valOrIgnore(info.systemKey1),
    systemKey2: valOrIgnore(info.systemKey2),
    systemKey3: valOrIgnore(info.systemKey3),
    systemKey4: valOrIgnore(info.systemKey4),
    systemKey5: `${info.topId}_${info.topName}`, // Always update systemKey5 to repTopId_repTopName

    // Remarks mapping
    remarksValue1: valOrIgnore(info.remarksValue1),
    remarksValue2: valOrIgnore(info.remarksValue2),
    remarksValue3: valOrIgnore(info.remarksValue3),
    remarksValue4: valOrIgnore(info.remarksValue4),
    remarksValue5: valOrIgnore(info.remarksValue5),
    remarksValue6: valOrIgnore(info.remarksValue6),
    remarksValue7: valOrIgnore(info.remarksValue7),
    remarksValue8: valOrIgnore(info.remarksValue8),
    remarksValue9: valOrIgnore(info.remarksValue9),
    remarksValue10: valOrIgnore(info.remarksValue10),
  };

  // Organize clusters by sheet
  let allClusters: Cluster[] = [];
  if (info.clusters && info.clusters.cluster) {
    if (Array.isArray(info.clusters.cluster)) {
      allClusters.push(...info.clusters.cluster);
    } else {
      allClusters.push(info.clusters.cluster);
    }
  }
  if (info.approval && info.approval.cluster) {
    if (Array.isArray(info.approval.cluster)) {
      allClusters.push(...info.approval.cluster);
    } else {
      allClusters.push(info.approval.cluster);
    }
  }

  const sheets: any[] = [];
  // Identify unique sheets, or use sheetCount
  const sheetCount = parseInt(info.sheetCount || '1', 10);

  for (let i = 1; i <= sheetCount; i++) {
    const sheetClusters = allClusters.filter((c) => c.sheetNo == i.toString());

    const xmlClusters = sheetClusters.map((c) => {
      // Map cluster fields to XML cluster node
      // Example from user:
      // <cluster>
      //   <sheetNo>1</sheetNo>
      //   <clusterId>101</clusterId>
      //   <value>45.5</value>
      //   ...
      // </cluster>
      const clusterNode: any = {
        sheetNo: c.sheetNo || i.toString(),
        clusterId: c.clusterId,
        value: c.value,
        // Add other fields if present and relevant for update
        // comment: c.comment
      };
      return clusterNode;
    });

    sheets.push({
      sheetNo: i.toString(),
      clusters: {
        cluster: xmlClusters,
      },
    });
  }

  top.sheets = {
    sheet: sheets,
  };

  const xmlObj = {
    conmas: {
      top: top,
    },
  };

  const builder = new Builder({
    rootName: 'root', // We constructing explicit root, usually Builder wraps in root if not careful, but here we pass 'conmas' as key
    headless: false, // User example has <?xml ...?>
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
  });

  // We already have 'conmas' as root key in xmlObj, so Builder should just process it if we pass it correctly?
  // Actually Builder wraps top level object keys as root elements.
  // So passing xmlObj where keys are 'conmas' will result in <conmas>...</conmas>

  return builder.buildObject(xmlObj);
}

export function generatePartialUpdateXml(
  topId: string,
  updates: SimpleClusterUpdate[],
  updateUser?: string,
  topName?: string // Added topName
): string {
  // Helper to handle partial updates
  // For top level fields, we use (ignore) to preserve existing values

  // Group by sheet
  const updatesBySheet = new Map<string, SimpleClusterUpdate[]>();
  for (const update of updates) {
    const sheet = update.sheetNo || '1';
    if (!updatesBySheet.has(sheet)) {
      updatesBySheet.set(sheet, []);
    }
    updatesBySheet.get(sheet)!.push(update);
  }

  const sheets: any[] = [];
  updatesBySheet.forEach((sheetUpdates, sheetNo) => {
    const xmlClusters = sheetUpdates.map((u) => ({
      sheetNo: sheetNo,
      clusterId: u.clusterId,
      value: u.value,
      approver: u.approver,
      approvalDate: u.approvalDate,
      approverComment: u.approverComment,
      approvalSignImage: u.approvalSignImage ? '(ignore)' : undefined, // If image path provided, we handle it in zip, here just ignore or set appropriately. Actually spec says "put filename here".
    }));

    // Fix for approvalSignImage: if it's a file path, we need to extract filename?
    // User spec: "put the filename here (e.g., stamp.png) and include the image file in the uploaded ZIP."
    // So we should map it to basics of file name.
    xmlClusters.forEach((c: any, index) => {
      const update = sheetUpdates[index];
      if (update.approvalSignImage) {
        // Extract filename from path
        const parts = update.approvalSignImage.split(/[\\/]/);
        c.approvalSignImage = parts[parts.length - 1];
      }
    });

    sheets.push({
      sheetNo: sheetNo,
      clusters: {
        cluster: xmlClusters,
      },
    });
  });

  const top: any = {
    repTopId: topId,
    editStatus: '1',
    repTopName: '(ignore)',

    createUserId: updateUser || '(ignore)', // Use provided user or ignore

    // System Keys - all ignore
    systemKey1: '(ignore)',
    systemKey2: '(ignore)',
    systemKey3: '(ignore)',
    systemKey4: '(ignore)',
    systemKey5: topName ? `${topId}_${topName}` : '(ignore)', // Update if topName provided

    // Remarks - all ignore
    remarksValue1: '(ignore)',
    remarksValue2: '(ignore)',
    remarksValue3: '(ignore)',
    remarksValue4: '(ignore)',
    remarksValue5: '(ignore)',
    remarksValue6: '(ignore)',
    remarksValue7: '(ignore)',
    remarksValue8: '(ignore)',
    remarksValue9: '(ignore)',
    remarksValue10: '(ignore)',

    sheets: {
      sheet: sheets,
    },
  };

  const xmlObj = {
    conmas: {
      top: top,
    },
  };

  const builder = new Builder({
    rootName: 'root',
    headless: false,
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
  });

  return builder.buildObject(xmlObj);
}
