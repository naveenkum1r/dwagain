const { MongoClient } = require("mongodb");
const https = require("https");

async function main() {
  // MongoDB connection URI and client setup
  const uri = "mongodb://tyi.duckdns.org:32768";
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    const database = client.db("db");
    const collection = database.collection("links");

    // Define the URL pattern
    const urlPattern = /^https:\/\/www\.cleanpng\.com\/png-[a-zA-Z0-9-]+-\d+\/?$/;

    // Query for records where 'dwagain' is null
    const cursor = collection.find({ dwagain: null });

    while (await cursor.hasNext()) {
      const record = await cursor.next();
      const url = record.url;

      // Check if the URL matches the pattern
      if (urlPattern.test(url)) {
        // Fetch the HTML of the URL and extract the first parameter of hits_process
        const hitsProcessParameter = await fetchHitsProcessParameter(url);

        if (hitsProcessParameter) {
          // Update the document's 'dwagain' field with the found parameter
          await collection.updateOne({ _id: record._id }, { $set: { dwagain: hitsProcessParameter } });
          console.log(`Updated record with _id: ${record._id}, dwagain set to: ${hitsProcessParameter}`);
        } else {
          // If the parameter is not found, set dwagain to 'no'
          await collection.updateOne({ _id: record._id }, { $set: { dwagain: "no" } });
          console.log(`Updated record with _id: ${record._id}, dwagain set to: no (parameter not found)`);
        }
      } else {
        // If the URL does not match, set dwagain to 'no'
        await collection.updateOne({ _id: record._id }, { $set: { dwagain: "no" } });
        console.log(`Updated record with _id: ${record._id}, dwagain set to: no (URL pattern mismatch)`);
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Ensure MongoDB client is closed
    await client.close();
  }
}

// Function to fetch the HTML and extract the first parameter of hits_process
function fetchHitsProcessParameter(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";

      // Accumulate data chunks
      res.on("data", (chunk) => {
        data += chunk;
      });

      // Once the data is fully received
      res.on("end", () => {
        // Regular expression to match the first parameter of hits_process
        const match = data.match(/hits_process\("([^"]+)"/);
        if (match) {
          resolve(match[1]); // Return the first parameter if found
        } else {
          resolve(null); // Return null if the parameter is not found
        }
      });
    }).on("error", (err) => {
      console.error("Error fetching URL:", err.message);
      reject(err);
    });
  });
}

// Run the main function
main().catch(console.error);
