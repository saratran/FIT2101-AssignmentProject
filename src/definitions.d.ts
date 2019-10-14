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
  name: string
}

type EmailContent = Welcome