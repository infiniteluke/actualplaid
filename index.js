const util = require("util");
const plaid = require("plaid");
const path = require("path");
const fastify = require("fastify")({ logger: { level: "fatal" } });
const actual = require("@actual-app/api");
const opn = require("better-opn");
const dateFns = require("date-fns");
const inquirer = require("inquirer");
const terminalLink = require("terminal-link");
const Conf = require("conf");

const config = new Conf();
let syncingData;

const ACTUAL_BUDGET_ID = process.env.ACTUAL_BUDGET_ID;

const APP_PORT = process.env.APP_PORT || 3000;

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "development";
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || "transactions").split(
  ","
);
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES, "US").split(",");

if (!PLAID_CLIENT_ID) {
  console.log(
    `Please provide a PLAID_CLIENT_ID env variable from the ${terminalLink(
      "Plaid Development Dashboard",
      "https://dashboard.plaid.com/overview/development"
    )}`
  );
}

if (!PLAID_SECRET) {
  console.log(
    `Please provide a PLAID_SECRET env variable from the ${terminalLink(
      "Plaid Development Dashboard",
      "https://dashboard.plaid.com/overview/development"
    )}`
  );
}

var client = new plaid.Client({
  clientID: PLAID_CLIENT_ID,
  secret: PLAID_SECRET,
  env: plaid.environments[PLAID_ENV],
  options: {
    version: "2019-05-29",
  },
});

const getTransactions = util.promisify(client.getTransactions);
const getAccounts = util.promisify(client.getAccounts);

const prettyPrint = (item) => {
  console.log(util.inspect(item, { colors: true, depth: 4 }));
};

const transactionMapper = (accountId) => (transaction) => ({
  account_id: accountId,
  date: transaction.date,
  amount: -transaction.amount * 100,
  payee: transaction.merchant_name || transaction.name,
  imported_payee: transaction.merchant_name || transaction.name,
  imported_id: transaction.transaction_id,
  pending: transaction.pending,
});

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

const start = async () => {
  try {
    await fastify.listen(APP_PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

const printSyncedAccounts = () => {
  const data = config.get("actualSync");
  if (!data) {
    console.log("No syncing data found");
  }
  console.table(
    Object.values(data).map((account) => ({
      "Actual Account": account.actualName,
      "Actual Type": account.actualType,
      "Plaid Bank": account.plaidBankName,
      "Plaid Account": account.plaidAccount.name,
      "Plaid Type": `${account.plaidAccount.subtype}/${account.plaidAccount.type}`,
      "Plaid Account #": account.plaidAccount.mask,
    }))
  );
};

module.exports = async (command, flags) => {
  if (!command) {
    console.log('Try "actualplaid --help"');
    process.exit();
  }
  try {
    if (!ACTUAL_BUDGET_ID) {
      console.log(
        `Please provide a ACTUAL_BUDGET_ID env variable from Settings --> Advanced in the Actual Budget app`
      );
      process.exit(1);
    }
    await actual.init();
    await actual.loadBudget(ACTUAL_BUDGET_ID);
    syncingData = config.get(`actualSync`) || {};
  } catch (e) {
    console.error(`Actual Budget Error: ${e.message}`);
    process.exit(1);
  }
  if (command === "config") {
    console.log(config.path);
    process.exit();
  } else if (command === "import") {
    if (Object.keys(syncingData).length) {
      try {
        const accountsToSync = Object.entries(syncingData).filter(
          ([_, account]) =>
            !flags["account"] || account.actualName === flags["account"]
        );

        for (let [actualId, account] of accountsToSync) {
          const startDate = dateFns.format(
            new Date(
              flags["since"] ||
                account.lastImport ||
                dateFns.startOfMonth(new Date())
            ),
            "yyyy-MM-dd"
          );
          const endDate = dateFns.format(new Date(), "yyyy-MM-dd");
          const transactionsResponse = await getTransactions.call(
            client,
            account.plaidToken,
            startDate,
            endDate,
            {}
          );

          await actual.importTransactions(
            actualId,
            transactionsResponse.transactions
              .filter(
                (transaction) =>
                  transaction.account_id === account.plaidAccount.account_id
              )
              .map(transactionMapper(actualId))
          );
          config.set(`actualSync.${actualId}.lastImport`, new Date());
        }
        console.log("Import completed");
        process.exit();
      } catch (e) {
        prettyPrint(e);
        process.exit(1);
      }
    } else {
      console.error(
        "No Plaid links found. Please run `actualplaid setup` before trying to import"
      );
      process.exit(1);
    }
  } else if (command === "setup") {
    const actualAccounts = await actual.getAccounts();
    const { dissmissedWarning } = await inquirer.prompt({
      type: "confirm",
      name: "dissmissedWarning",
      message: `WARNING: A Plaid Dev account has a limited number of Links. See the ${terminalLink(
        "Plaid Development Dashboard",
        "https://dashboard.plaid.com/overview/development"
      )} to check your usage. Proceed?`,
    });
    if (dissmissedWarning) {
      start();
      const { correctBudget } = await inquirer.prompt({
        type: "confirm",
        name: "correctBudget",
        message: `You are about to setup Plaid Links for the following Actual Budget File: ${ACTUAL_BUDGET_ID}. Proceed?`,
      });
      if (correctBudget) {
        const { accountsToSync } = await inquirer.prompt({
          type: "checkbox",
          name: "accountsToSync",
          message: "Which accounts do you want to sync with plaid?",
          choices: actualAccounts.map(({ name, id }) => ({ name, value: id })),
        });

        const { confirm } = await inquirer.prompt({
          type: "confirm",
          name: "confirm",
          message: `A browser window will now open. Please link each bank you expect to sync with Actual. Proceed?`,
        });

        if (!confirm) {
          process.exit(1);
        }

        const plaidLinkLink = `http://localhost:${APP_PORT}`;
        console.log(
          `Opening ${plaidLinkLink} to link with Plaid...\nNOTE: Please return to your CLI when completed.`
        );
        opn(plaidLinkLink);

        const { doneLinking } = await inquirer.prompt({
          type: "confirm",
          name: "doneLinking",
          message: `Are you done linking banks?`,
        });
        const plaidAccounts = config.get("plaidAccounts");
        if (!plaidAccounts) {
          console.log("You did not Link any Plaid accounts");
          process.exit(1);
        }

        for (acctId of accountsToSync) {
          actualAcct = actualAccounts.find((a) => a.id === acctId);
          console.log(plaidAccounts);
          let syncChoices = Object.values(plaidAccounts).map(
            ({ account, plaidBankName }) => ({
              value: account.account_id,
              name: `${plaidBankName}: ${account.name} - ${account.subtype}/${account.type} (${account.mask})`,
            })
          );
          const { plaidAccountToSync } = await inquirer.prompt({
            type: "list",
            name: "plaidAccountToSync",
            message: `Which Plaid acount do you want to sync with "${actualAcct.name}"?`,
            choices: syncChoices,
          });
          console.log({ plaidAccountToSync });
          const plaidAccount = Object.values(plaidAccounts).find(
            ({ account }) => account.account_id === plaidAccountToSync
          );
          console.log({ plaidAccount });

          config.set(`actualSync.${acctId}`, {
            actualName: actualAcct.name,
            actualType: actualAcct.type,
            actualAccountId: actualAcct.id,
            plaidItemId: plaidAccount.plaidItemId,
            plaidToken: plaidAccount.plaidToken,
            plaidAccount: plaidAccount.account,
            plaidBankName: plaidAccount.plaidBankName,
          });
        }
        printSyncedAccounts();
      }
      console.log(
        `Setup completed sucessfully. Run \`actualplaid import\` to sync your setup banks with their respective actual accounts`
      );
      process.exit();
    } else {
      console.error(`Setup was not run`);
      process.exit();
    }
  } else if (command === "ls") {
    printSyncedAccounts();
    process.exit();
  }
};

fastify.get("/", (requst, reply) => reply.sendFile("index.html"));

fastify.post("/create_link_token", (request, reply) => {
  const configs = {
    user: { client_user_id: "user-id" },
    client_name: "Actual Budget Plaid Importer",
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: "en",
  };
  client.createLinkToken(configs, (error, res) => {
    if (error != null) {
      prettyPrint(error);
      process.exit(1);
    }
    reply.send({ link_token: res.link_token });
  });
});

fastify.post("/get_access_token", (request, reply) => {
  const body = JSON.parse(request.body);
  client.exchangePublicToken(body.public_token, (error, tokenResponse) => {
    if (error != null) {
      prettyPrint(error);
      process.exit(1);
    }
    client.getAccounts(tokenResponse.access_token, async (error, res) => {
      if (error != null) {
        prettyPrint(error);
        process.exit(1);
      }
      client.getInstitutionById(res.item.institution_id, (error, res) => {
        if (error != null) {
          prettyPrint(error);
          process.exit(1);
        }
        res.accounts.forEach((account) => {
          config.set(`plaidAccounts.${account.account_id}`, {
            account,
            plaidToken: tokenResponse.access_token,
            plaidItemId: tokenResponse.item_id,
            plaidBankName: res.institution.name,
          });
        });
        reply.send({ ok: true });
      });
    });
  });
});
