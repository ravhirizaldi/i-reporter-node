import { IReporterNode } from '../src/index';

async function main() {
  const reporter = new IReporterNode({
    domain: process.env.IRPT_DOMAIN || 'https://your-ireporter-server.com/',
    username: process.env.IRPT_USERNAME || 'conmasadmin',
    password: process.env.IRPT_PASSWORD || 'conmasadmin',
  });

  try {
    const topId = '53';
    // User requested clusterId 310 (operator 1st check)
    // Cluster <value>: 4 = Approved
    const updates = [
      {
        clusterId: '369',
        value: '4', // Approved
        sheetNo: '1',
        approver: 'user01', // Needs to be a valid user ID
        approvalDate: '2025/03/01',
        approverComment: 'Approved via Script with Auto-QR',
        // approvalSignImage: 'c:/path/to/stamp.png' // Commented out to trigger auto-QR
      },
      {
        clusterId: '360',
        value: 'ganti keterangan yaa',
        sheetNo: '1',
      },
    ];

    const result = await reporter.updateReport(
      {
        topId: topId,
        topName: 'TestReport', // Used for systemKey5
        updateUser: 'conmasadmin',
        mode: 1, // Force update
      },
      updates
    );

    console.log('Update Result:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

main();
