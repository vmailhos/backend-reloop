import AWS from "aws-sdk";

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY
});

export const ses = new AWS.SES();
