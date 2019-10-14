interface Contribution {
  commitCount: number;
  lineChangeCount: number;
}

interface Contributor {
  username: string;
  email: string;
  name: string;
  contribution: Contribution;
}

interface FileInfo {
  filename: string;
  // lineCount: number;
  yourContributions: Contribution;
  otherContributors: Contributor[];
}

interface Welcome{
  content:{
    name: string
  }
  attachments: EmailAttachment[],
  template: string
}

interface EmailAttachment{
  filename: string,
  path: string,
  cid: string
}

type EmailContent = Welcome