import {QdrantClient} from '@qdrant/qdrant-js';

async function main() {
    const collectionName = 'test_collection';
    
    console.log('🚀 Starting Qdrant Vector Database Example');
    console.log('==========================================');

    console.log('\n📡 Step 1: Connecting to Qdrant server...');
    const client = new QdrantClient({url: 'http://127.0.0.1:6333'});
    console.log('✅ Connected to Qdrant at http://127.0.0.1:6333');

    console.log('\n📋 Step 2: Checking existing collections...');
    const response = await client.getCollections();

    const collectionNames = response.collections.map((collection) => collection.name);
    console.log('📚 Found existing collections:', collectionNames.length > 0 ? collectionNames : 'None');

    if (collectionNames.includes(collectionName)) {
        console.log(`🗑️  Collection '${collectionName}' already exists. Deleting it...`);
        await client.deleteCollection(collectionName);
        console.log('✅ Collection deleted successfully');
    }

    console.log(`\n🏗️  Step 3: Creating new collection '${collectionName}'...`);
    console.log('Configuration:');
    console.log('  - Vector size: 4 dimensions');
    console.log('  - Distance metric: Cosine similarity');
    console.log('  - Segment number: 2');
    console.log('  - Replication factor: 2');
    
    await client.createCollection(collectionName, {
        vectors: {
            size: 4,
            distance: 'Cosine',
        },
        optimizers_config: {
            default_segment_number: 2,
        },
        replication_factor: 2,
    });
    console.log('✅ Collection created successfully!');

    console.log('\n🗂️  Step 4: Creating payload indexes for faster filtering...');
    //  -------- Create payload indexes -------------

    console.log('  📇 Creating index for "city" field (keyword type)...');
    await client.createPayloadIndex(collectionName, {
        field_name: 'city',
        field_schema: 'keyword',
        wait: true,
    });
    console.log('  ✅ City index created');

    console.log('  📇 Creating index for "count" field (integer type)...');
    await client.createPayloadIndex(collectionName, {
        field_name: 'count',
        field_schema: 'integer',
        wait: true,
    });
    console.log('  ✅ Count index created');

    console.log('  📇 Creating index for "coords" field (geo type)...');
    await client.createPayloadIndex(collectionName, {
        field_name: 'coords',
        field_schema: 'geo',
        wait: true,
    });
    console.log('  ✅ Coordinates index created');

    console.log('\n📊 Step 5: Adding vector points to the database...');
    //  -------- Add points -------------
    
    const pointsToAdd = [
        {
            id: 1,
            vector: [0.05, 0.61, 0.76, 0.74],
            payload: {
                city: 'Berlin',
                country: 'Germany',
                count: 1000000,
                square: 12.5,
                coords: {lat: 1.0, lon: 2.0},
            },
        },
        {id: 2, vector: [0.19, 0.81, 0.75, 0.11], payload: {city: ['Berlin', 'London']}},
        {id: 3, vector: [0.36, 0.55, 0.47, 0.94], payload: {city: ['Berlin', 'Moscow']}},
        {id: 4, vector: [0.18, 0.01, 0.85, 0.8], payload: {city: ['London', 'Moscow']}},
        {id: '98a9a4b1-4ef2-46fb-8315-a97d874fe1d7', vector: [0.24, 0.18, 0.22, 0.44], payload: {count: [0]}},
        {id: 'f0e09527-b096-42a8-94e9-ea94d342b925', vector: [0.35, 0.08, 0.11, 0.44]},
    ];
    
    console.log(`📝 Adding ${pointsToAdd.length} points with vectors and metadata...`);
    console.log('Points preview:');
    pointsToAdd.forEach((point, index) => {
        console.log(`  Point ${index + 1}: ID=${point.id}, Vector=[${point.vector.join(', ')}], Payload=${JSON.stringify(point.payload || 'none')}`);
    });

    await client.upsert(collectionName, {
        wait: true,
        points: pointsToAdd,
    });
    console.log('✅ All points added successfully!');

    console.log('\n📈 Step 6: Verifying collection status...');
    const collectionInfo = await client.getCollection(collectionName);
    console.log('✅ Collection verification complete:');
    console.log(`   - Total points stored: ${collectionInfo.points_count}`);
    console.log(`   - Collection status: ${collectionInfo.status}`);
    // prints: number of points: 6

    console.log('\n🔍 Step 7: Retrieving specific points by ID...');
    console.log('Requesting points with IDs: [1, 2]');
    const points = await client.retrieve(collectionName, {
        ids: [1, 2],
    });

    console.log('✅ Points retrieved successfully:');
    console.log('📋 Retrieved points details:', JSON.stringify(points, null, 2));
    // prints:
    // points:  [
    //     {
    //       id: 1,
    //       payload: {
    //         city: 'Berlin',
    //         coords: [Object],
    //         count: 1000000,
    //         country: 'Germany',
    //         square: 12.5
    //       },
    //       vector: null
    //     },
    //     { id: 2, payload: { city: [Array] }, vector: null }
    //   ]

    console.log('\n🎯 Step 8: Performing vector similarity search...');
    // -------- Search ----------------
    const queryVector = [0.2, 0.1, 0.9, 0.7];
    console.log(`🔍 Query vector: [${queryVector.join(', ')}]`);
    console.log('🎯 Searching for 3 most similar vectors using cosine similarity...');

    const res1 = await client.search(collectionName, {
        vector: queryVector,
        limit: 3,
    });

    console.log('✅ Search completed! Results ordered by similarity score:');
    console.log('🏆 Search results:', JSON.stringify(res1, null, 2));
    // prints:
    // search result:  [
    // {
    //     id: 4,
    //     version: 3,
    //     score: 0.99248314,
    //     payload: { city: [Array] },
    //     vector: null
    // },
    // {
    //     id: 1,
    //     version: 3,
    //     score: 0.89463294,
    //     payload: {
    //         city: 'Berlin',
    //         coords: [Object],
    //         count: 1000000,
    //         country: 'Germany',
    //         square: 12.5
    //     },
    //     vector: null
    // },
    // {
    //     id: '98a9a4b1-4ef2-46fb-8315-a97d874fe1d7',
    //     version: 3,
    //     score: 0.8543979,
    //     payload: { count: [Array] },
    //     vector: null
    // }
    // ]

    console.log('\n🔄 Step 9: Performing batch search (multiple queries at once)...');
    console.log('Running 2 searches in parallel:');
    console.log('  - Search 1: Same query vector, limit 1 result');
    console.log('  - Search 2: Same query vector, limit 2 results');
    
    const resBatch = await client.searchBatch(collectionName, {
        searches: [
            {
                vector: queryVector,
                limit: 1,
            },
            {
                vector: queryVector,
                limit: 2,
            },
        ],
    });

    console.log('✅ Batch search completed!');
    console.log('📊 Batch search results:', JSON.stringify(resBatch, null, 2));
    // prints:
    // search batch result:  [
    //     [
    //         {
    //             id: 4,
    //             version: 3,
    //             score: 0.99248314,
    //             payload: null,
    //             vector: null
    //         }
    //     ],
    //     [
    //         {
    //             id: 4,
    //             version: 3,
    //             score: 0.99248314,
    //             payload: null,
    //             vector: null
    //         },
    //         {
    //             id: 1,
    //             version: 3,
    //             score: 0.89463294,
    //             payload: null,
    //             vector: null
    //         }
    //     ]
    // ]

    console.log('\n🎛️  Step 10: Performing filtered vector search...');
    // -------- Search filters ----------------
    console.log('🔍 Searching with filter: city must contain "Berlin"');
    console.log('This will only return vectors from points that have Berlin in their city field');

    const res2 = await client.search(collectionName, {
        vector: queryVector,
        limit: 3,
        filter: {
            must: [
                {
                    key: 'city',
                    match: {
                        value: 'Berlin',
                    },
                },
            ],
        },
    });

    console.log('✅ Filtered search completed!');
    console.log('🎯 Filtered search results (Berlin cities only):', JSON.stringify(res2, null, 2));
    // prints:
    // search result with filter:  [
    //     {
    //       id: 1,
    //       version: 3,
    //       score: 0.89463294,
    //       payload: {
    //         city: 'Berlin',
    //         coords: [Object],
    //         count: 1000000,
    //         country: 'Germany',
    //         square: 12.5
    //       },
    //       vector: null
    //     },
    //     {
    //       id: 3,
    //       version: 3,
    //       score: 0.83872515,
    //       payload: { city: [Array] },
    //       vector: null
    //     },
    //     {
    //       id: 2,
    //       version: 3,
    //       score: 0.66603535,
    //       payload: { city: [Array] },
    //       vector: null
    //     }
    // ]

    console.log('\n🎉 Step 11: Vector database example completed successfully!');
    console.log('==========================================');
    console.log('Summary of operations performed:');
    console.log('✅ 1. Connected to Qdrant server');
    console.log('✅ 2. Checked and cleaned existing collections');
    console.log('✅ 3. Created new collection with vector configuration');
    console.log('✅ 4. Built payload indexes for efficient filtering');
    console.log('✅ 5. Inserted 6 vector points with metadata');
    console.log('✅ 6. Verified collection status and point count');
    console.log('✅ 7. Retrieved specific points by ID');
    console.log('✅ 8. Performed similarity search');
    console.log('✅ 9. Executed batch searches');
    console.log('✅ 10. Applied filtered search with conditions');
    console.log('\n🔍 Key concepts demonstrated:');
    console.log('  - Vector similarity using cosine distance');
    console.log('  - Metadata filtering and indexing');
    console.log('  - Batch operations for efficiency');
    console.log('  - Point retrieval and search operations');

    return 0;
}

main()
    .then((code) => {
        process.exit(code);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
