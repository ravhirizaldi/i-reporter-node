import { IReporterNode } from '../dist/index.js'; // Importing from src for direct testing

// Example usage
async function main() {
  const reporter = new IReporterNode({
    domain: process.env.IRPT_DOMAIN || 'https://your-ireporter-server.com/',
    username: process.env.IRPT_USERNAME || 'conmasadmin',
    password: process.env.IRPT_PASSWORD || 'conmasadmin',
  });

  try {
    // 1. Get Report List
    console.log('Fetching report list...');
    const reports = await reporter.getReportList();
    console.log('Reports:', JSON.stringify(reports, null, 2));

    // 2. Get Document Detail
    console.log('Fetching document detail...');
    const detail = await reporter.getDocumentDetail({ topId: '53' });
    console.log('Detail:', JSON.stringify(detail, null, 2));

    // 3. Get Master Record List
    console.log('Fetching master record list...');
    const masterRecords = await reporter.getMasterRecordList({ masterId: '14' });
    console.log('Master Records:', JSON.stringify(masterRecords, null, 2));

    console.log('Example script ready. storage/credentials dependent calls commented out.');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
