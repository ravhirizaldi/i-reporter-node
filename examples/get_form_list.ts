import { IReporterNode } from '../src/index';

// You can run this file with: npx tsx examples/get_form_list.ts

const config = {
  domain: process.env.IRPT_DOMAIN || 'https://your-ireporter-server.com/',
  username: process.env.IRPT_USERNAME || 'conmasadmin',
  password: process.env.IRPT_PASSWORD || 'conmasadmin',
};

async function main() {
  const ireporter = new IReporterNode(config);

  try {
    console.log('Fetching Form List...');

    // Example 1: Basic list
    const basicList = await ireporter.getFormList();
    console.log('Basic List Result:', JSON.stringify(basicList, null, 2));

    // Example 2: Filter by word
    const filteredList = await ireporter.getFormList({
      word: 'Test',
      wordTargetName: true,
      publicStatus: 2, // Published only
    });
    console.log('Filtered List Result:', JSON.stringify(filteredList, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Data:', error.response.data);
    }
  }
}

if (require.main === module) {
  main();
}
