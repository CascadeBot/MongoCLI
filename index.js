const chalk = require("chalk");
const { prompt } = require("enquirer");
const childProcess = require("child_process");
const fs = require("fs");

const backup = async (username, password, host, port) => {
    console.log()
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
    
    let { database, collection } = await prompt([
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
}

run().catch(error => {
    console.error(error);
});