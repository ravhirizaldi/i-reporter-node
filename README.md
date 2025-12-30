# i-reporter-node

A Node.js client library for the ConMas i-Reporter API, enabling seamless interaction with i-Reporter servers for document management, report updates, and master record retrieval.

## Features

- **Authentication**: Easy login/logout management.
- **Document Management**: Create new documents, including importing data via CSV/XML.
- **Report Updates**: Modify existing reports, update specific clusters, and handle approval flows.
- **Master Data**: Retrieve master record lists.
- **Utilities**: Built-in support for image handling and QR code generation.

## Installation

```bash
npm install i-reporter-node
```

## Usage

### Initialization

```typescript
import { IReporterNode } from 'i-reporter-node';

const client = new IReporterNode({
  domain: 'https://your-ireporter-server.com/',
  username: 'your-username',
  password: 'your-password',
});
```

### Fetching Report List

```typescript
const reports = await client.getReportList();
console.log(reports);
```

### Creating a Document

```typescript
await client.createDocument({
  defTopId: '222',
  repTopName: 'New Report',
  createUserId: 'user01',
  systemKey5: 'ORDER-123',
  // ... other parameters
});
```

### Updating a Cluster

```typescript
await client.updateReport(
  {
    topId: '53',
    mode: 1, // Force update
  },
  [
    {
      clusterId: '369',
      value: 'Approved',
      sheetNo: '1',
    },
  ]
);
```

## Configuration

Ensure you have the correct endpoint and credentials. For example scripts, you can use environment variables:

- `IRPT_DOMAIN`
- `IRPT_USERNAME`
- `IRPT_PASSWORD`

## License

MIT © [Ravhi Rizaldi](./LICENSE)
