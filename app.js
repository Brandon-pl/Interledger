import {createClient} from "tigerbeetle-node"
import fs from "fs"


const client = createClient({
    cluster_id: 0n,
    replica_addresses: [process.env.TB_ADDRESS || "3000"],
  });

  console.log(client)



// Create the TigerBeetle client.
// //const client = new tigerbeetle.Client({
//   cluster_id: 0n,
//   addresses: ['127.0.0.1:3000'],
// });

// Function to initialize accounts for users and charities.
async function initializeAccounts() {
  try {
    const data = fs.readFileSync('client.json', 'utf8');
    const { users, charities } = JSON.parse(data);

    // Create accounts for each charity.
    const charityAccounts = charities.map(charity => ({
      id: BigInt(charity.id),
      user_data: BigInt(0),
      reserved: 0,
      debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
  credits_posted: 0n,
  user_data_128: 0n,
  user_data_64: 0n,
  user_data_32: 0,

      ledger: charity.ledger,
      code: 1,
      flags: 0,
      debit_balance: BigInt(0),
      credit_balance: BigInt(0),
      timestamp: 0n,

    }));

    // Create accounts for each user.
    const userAccounts = users.map(user => ({
      id: BigInt(user.id),
      user_data: BigInt(0),
      reserved: 0,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
  credits_posted: 0n,
  user_data_128: 0n,
  user_data_64: 0n,
  user_data_32: 0,

      ledger: 1,
      code: 1,
      flags: 0,
      debit_balance: BigInt(0),
      credit_balance: BigInt(0),
      timestamp: 0n,

    }));

    // Combine accounts for batch creation.
    const accounts = [...charityAccounts, ...userAccounts];

    // Create accounts in TigerBeetle.
    await client.createAccounts(accounts);
    console.log(`${accounts.length} accounts initialized successfully.`);
  } catch (error) {
    console.error('Error initializing accounts:', error);
  } finally {
    //client.close();
  }
}

// Function to process scheduled pledges.
async function processPledges() {
  try {
    const data = fs.readFileSync('client.json', 'utf8');
    const { users } = JSON.parse(data);

    const today = new Date();

    for (const user of users) {
      for (const pledge of user.pledges) {
        const scheduledDate = new Date(pledge.scheduled_date);

        // Process only if the scheduled date has arrived or passed.
        if (scheduledDate <= today && pledge.status === 'pending') {
          const transfer = {
            id: BigInt(Date.now()), // Unique transfer ID using current timestamp.
            debit_account_id: BigInt(user.id),
            credit_account_id: BigInt(pledge.charity_id),
            ledger: 1,
            code: 1,
            amount: BigInt(pledge.amount),
            timeout: 0,
            flags: 0,
          };

          try {
            // Create the transfer in TigerBeetle.
            await client.createTransfers([transfer]);
            console.log(`Pledge of ${pledge.amount} from user ${user.id} to charity ${pledge.charity_id} processed.`);
          } catch (transferError) {
            console.error(`Error processing pledge for user ${user.id}:`, transferError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing pledges:', error);
  } finally {
    //client.close();
  }
}

// Initialize accounts and process pledges.
initializeAccounts().then(() => processPledges());
