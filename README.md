# CyberMedAssist

A medical AI assistant specialized in medical billing, coding, insurance policies, and practice management.

## Features

- Real-time chat interface with AI
- Specialized knowledge in:
  - Medical billing
  - ICD-10 and CPT coding
  - Insurance policies
  - Patient procedures
  - Practice management

## Tech Stack

- Next.js 14
- TypeScript
- AWS Bedrock (Claude 3.5 Sonnet)
- Tailwind CSS

## Development

1. Clone the repository:
```bash
git clone [your-repo-url]
cd cyber-med-assist
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

4. Run the development server:
```bash
npm run dev
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Visit [Vercel](https://vercel.com) and create a new project

3. Connect your GitHub repository

4. Add the following environment variables in Vercel:
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

5. Deploy!

### Security Notes

- Ensure your AWS IAM user has minimal required permissions:
  ```json
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "bedrock:InvokeModel"
              ],
              "Resource": "arn:aws:bedrock:us-east-1:*:model/anthropic.claude-3-5-sonnet-20240620-v1:0"
          }
      ]
  }
  ```
- Keep your AWS credentials secure and never commit them to version control
- Consider using AWS IAM roles for production deployments

## License

MIT
