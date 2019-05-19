const chalk = require("chalk");
const { prompt } = require("enquirer");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const isDirectory = source => fs.lstatSync(source).isDirectory()
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const backup = async (username, password, host, port) => {

    let { path, database, query } = await prompt([
        {
            type: "input",
            name: "path",
            message: "What folder to backup to?",
            initial: "dump",
        },
        {
            type: "input",
            name: "database",
            message: "Which database to backup? (Empty for all)"
        },
        {
            type: "input",
            name: "query",
            message: "Do you have a query for the data? (Empty for none)"
        }
    ]);

    let backupUsers, collection;
    ({ backupUsers } = await prompt({
        type: "confirm",
        name: "backupUsers",
        initial: true,
        message: "Backup users?"
    }));
    if (!backupUsers) {
        ({ collection } = await prompt({
            type: "input",
            name: "collection",
            message: "Which collection to backup? (Empty for all)"
        }))
    }

    var args = ["--host", host + ":" + port, "--out", path]
    if (username) args.push("--username", username)
    if (password) args.push("--password", password)
    if (database) args.push("--db", database)
    if (collection) args.push("--collection", collection)
    if (backupUsers) args.push("--dumpDbUsersAndRoles")
    if (query) args.push("--query", query)

    var dump = childProcess.spawn("mongodump", args);
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
            console.log(chalk.red(`Mongodump exited with a non-zero exit code! Code: ${code}`));
        } else {
            console.log(chalk.green("Exited mongodump successfully!"))
        }
    })
}

const restore = async (username, password, host, port) => {

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
    if (backupUsers) args.push("--restoreDbUsersAndRoles")

    var dump = childProcess.spawn("mongodump", args);
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
            console.log(chalk.red(`Mongodump exited with a non-zero exit code! Code: ${code}`));
        } else {
            console.log(chalk.green("Exited mongodump successfully!"))
        }
    })
}

const run = async () => {

    
    let { mode } = await prompt({
        type: "select",
        name: "mode",
        message: "Backup or restore?",
        choices: ["Backup", "Restore"]
    });

    if (mode === "Backup") {
        console.log(chalk.red("----- Backup mode -----"));
        backup(username, password, host, port);
    }
    if (mode === "Restore") {
        console.log(chalk.red("----- Restore mode -----"));
        restore(username, password, host, port);
    }

}

run().catch(error => {
    console.error(error);
});