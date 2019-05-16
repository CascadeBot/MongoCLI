const chalk = require("chalk");
const { prompt } = require("enquirer");
const childProcess = require("child_process");
const fs = require("fs");

const backup = async (username, password, host, port) => {
    console.log(chalk.red("----- Backup mode -----"));

    let { path, database, collection } = await prompt([
        {
            type: "input",
            name: "path",
            message: "What folder to restore to?",
            initial: ".\\dump",
        },
        {
            type: "input",
            name: "database",
            message: "Which database? (Empty for all)"
        },
        {
            type: "input",
            name: "collection",
            message: "Which collection? (Empty for all)"
        }
    ]);

    let backupUsers;
    if (database && !collection) {
        ({ backupUsers } = await prompt({
            type: "confirm",
            name: "backupUsers",
            initial: true,
            message: "Backup users?"
        }));
    }

    var args = ["--host", host + ":" + port, "--out", path]
    if (username) args.push("--username", username)
    if (password) args.push("--password", password)
    if (database) args.push("--db", database)
    if (collection) args.push("--collection", database)
    if (backupUsers) args.push("--dumpDbUsersAndRoles")

    var dump = childProcess.spawn("mongodump", args);
    dump.stdout.on("data", data => {
        console.log(data);
    })
    dump.stderr.on("data", data => {
        console.log(chalk.red(data))
    })
    dump.on("exit", code => {
        if (code != 0) {
            console.log(chalk.red(`Mongodump exited with a non-zero exit code! Code: ${code}`));
        } else {
            console.log(chalk.green("Exited mongodump successfully!"))
        }
    })

}

const run = async () => {

    console.log(chalk.bold.green("Welcome to Cascade Bot's Mongo CLI!"));

    let { usesCredentials } = await prompt({
        type: "confirm",
        name: "usesCredentials",
        message: "Does the MongoDB Server need authentication?",
        initial: true
    });

    var username, password;

    if (usesCredentials) {
        let results = await prompt([
            {
                type: "input",
                name: "username",
                message: "What is the username?",
                validate(value) {
                    return value.trim().length < 1 ? "You cannot have a blank username!" : true;
                }
            },
            {
                type: "password",
                name: "password",
                message: "What is the password?",
                validate(value) {
                    return value.trim().length < 1 ? "You cannot have a blank password!" : true;
                }
            }
        ]);
        ({ username, password } = results);
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
                return (port >= 1 && port <= 65535) ? true : "Please enter a port number between 1 and 65535!";
            }
        }
    ])

    let { mode } = await prompt({
        type: "select",
        name: "mode",
        message: "Backup or restore?",
        choices: ["Backup", "Restore"]
    });

    if (mode === "Backup") backup(username, password, host, port);
    if (mode === "Restore") restore(username, password, host, port);

}

run().catch(error => {
    console.error(error);
});