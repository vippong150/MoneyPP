const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'moneypp';
let client;
let db;

async function connectDB() {
    if (!MONGODB_URI) {
        console.log('No MONGODB_URI set — using JSON file storage (data may be lost on deploy)');
        return null;
    }
    try {
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB');
        return db;
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        console.log('Falling back to JSON file storage');
        return null;
    }
}

async function readJSON(collectionName) {
    if (!db) {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, collectionName + '.json');
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch (e) { return null; }
    }
    const doc = await db.collection(collectionName).findOne({ _id: 'singleton' });
    return doc ? doc.data : null;
}

async function writeJSON(collectionName, data) {
    if (!db) {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, collectionName + '.json');
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return;
    }
    await db.collection(collectionName).updateOne(
        { _id: 'singleton' },
        { $set: { data } },
        { upsert: true }
    );
}

async function initCollection(collectionName, defaultData, seedFile) {
    const fs = require('fs');
    const path = require('path');

    if (db) {
        // MongoDB mode: check if data exists
        const existing = await db.collection(collectionName).findOne({ _id: 'singleton' });
        if (existing) {
            console.log(collectionName + ' exists (kept existing data)');
            return;
        }
    } else {
        // JSON file mode: check if file exists
        const file = path.join(__dirname, collectionName + '.json');
        if (fs.existsSync(file)) {
            console.log(collectionName + ' exists (kept existing data)');
            return;
        }
    }

    // Initialize with seed or default
    let data = defaultData;
    if (seedFile && fs.existsSync(path.join(__dirname, seedFile))) {
        try {
            const seedPath = path.join(__dirname, seedFile);
            data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
            console.log('Seeded ' + collectionName + ' from ' + seedFile);
        } catch (e) {
            console.log('Using default data for ' + collectionName);
        }
    } else {
        console.log('Initialized ' + collectionName);
    }

    await writeJSON(collectionName, data);
}

async function disconnectDB() {
    if (client) await client.close();
}

module.exports = { connectDB, readJSON, writeJSON, initCollection, disconnectDB };
