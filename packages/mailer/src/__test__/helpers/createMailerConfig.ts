const createMailerConfig = () => {
  return {
    defaults: {
      from: {
        address: "sender@example.com",
        name: "Mailer Team",
      },
    },
    templateData: { exampleUrl: "http://localhost:2000/" },
    templating: { templateFolder: "mjml/templates" },
    test: { enabled: true, path: "/test/email", to: "receiver@example.com" },
    transport: {
      auth: { pass: "pass", user: "user" },
      host: "localhost",
      port: 20073,
      requireTLS: false,
      secure: false,
    },
  };
};

export default createMailerConfig;
