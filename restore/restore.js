const run = async () => {
    console.log(chalk.bold.green("Welcome to Cascade Bot's Mongo CLI Restore!"))

    let { usesCredentials } = await prompt({
        type: "confirm",
        name: "usesCredentials",
        message: "Does the MongoDB Server need authentication?",
        initial: true
    })

    var username, password

    if (usesCredentials) {
        let results = await prompt([
            {
                type: "input",
                name: "username",
                message: "What is the username?",
                validate(value) {
                    return value.trim().length < 1 ? "You cannot have a blank username!" : true
                }
            },
            {
                type: "password",
                name: "password",
                message: "What is the password?",
                validate(value) {
                    return value.trim().length < 1 ? "You cannot have a blank password!" : true
                }
            }
        ])
        ({ username, password } = results)
    }

    let { host, port } = await prompt([
        {
            type: "input",
            name: "host",
            message: "Host to connect to?",
            initial: "localhost"
        },
        {
            type: "numeral",
            float: false,
            name: "port",
            message: "Port to connect to?",
            initial: 27017,
            validate(port) {
                return (port >= 1 && port <= 65535) ? true : "Please enter a port number between 1 and 65535!"
            }
        }
    ])

    let { bsonFile, collection, database, dryRun } = await prompt([
        {
            type: "input",
            name: "bsonFile",
            message: "Which BSON file would you like to backup?",
            initial: "dump",
            validate(file) {
                return (file.endsWith(".bson") && fs.existsSync(file)) ? true : "Please enter the path to a valid BSON file!";
            }
        },
        {
            type: "input",
            name: "database",
            message: "Which database to restore to?",
            validate(database) {
                return database.length > 0 ? true : "The database is required!"
            }
        },
        {
            type: "input",
            name: "collection",
            message: "Which collection to restore to?",
            validate(collection) {
                return collection.length > 0 ? true : "The collection is required!"
            }
        },
        {
            type: "confirm",
            name: "dryRun",
            message: "Do you want to do a dry run? HIGHLY RECOMMENDED",
            initial: true
        }]);

    let args = ["--host", host + ":" + port, "--dir", path]
    if (username) args.push("--username", username)
    if (password) args.push("--password", password)
    if (database) args.push("--db", database)
    if (collection) args.push("--collection", collection)
    if (dryRun) args.push("")

    var dump = childProcess.spawn("mongorestore", args);
    dump.stderr.setEncoding("UTF-8")
    dump.stdout.on("data", data => {
        console.log(data.replace("\n", ""));
    })
    dump.stderr.setEncoding("UTF-8")
    dump.stderr.on("data", data => {
        console.log(chalk.red(data.replace("\n", "")))
    })
    dump.on("exit", code => {
        if (code != 0) {
            console.log(chalk.red(`Mongorestore exited with a non-zero exit code! Code: ${code}`));
        } else {
            console.log(chalk.green("Exited mongorestore successfully!"))
        }
    })

}

run().catch(error => {
    console.error(error)
})