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

interface EmailAttachment{
  filename: string,
  path: string,
  cid: string
}

interface EmailContent{
  content: any,
  template: {
    name: string,
    attachments: EmailAttachment[]
  }
}
