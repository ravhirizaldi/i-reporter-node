import { IReporterNode } from '../src/index';

async function main() {
  const client = new IReporterNode({
    domain: process.env.IRPT_DOMAIN || 'https://your-ireporter-server.com/',
    username: process.env.IRPT_USERNAME || 'conmasadmin',
    password: process.env.IRPT_PASSWORD || 'conmasadmin',
  });

  try {
    console.log('Creating document...');
    const result = await client.createDocument({
      defTopId: '222', // Example ID, might need adjustment based on real server data or mocks
      repTopName: `Production Report ${new Date().toISOString()}`,
      createUserId: 'user01',
      createRoleMode: 1,
      systemKey5: 'ORDER-TEST-888',
      sheets: [
        {
          sheetNo: 1,
          clusters: [
            {
              clusterId: 73,
              value: 100,
              sheetNo: 1,
            },
            {
              sheetNo: 1, // redundant but testing handling
              clusterId: 74,
              value: 200,
            },
          ],
        },
      ],
      userMode: 1,
    });

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
