const bsonStream = require("bson-stream");
const bson = require("bson");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { prompt } = require("enquirer");

const getAllFiles = dir =>
    fs.readdirSync(dir).reduce((files, file) => {
        const name = path.join(dir, file);
        const isDirectory = fs.statSync(name).isDirectory();
        return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
    }, []);

const run = async () => {

    let { path } = await prompt({
        type: "input",
        message: "Enter a path to your backup directory",
        name: "path",
        validate(inputPath) {
            return (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) ? true : "Enter the path to a directory!";
        }
    });

    let { bsonFile } = await prompt({
        type: "select",
        choices: getAllFiles(path),
        message: "Select a BSON file to filter"
    });

    let readStream = fs.createReadStream(bsonFile);

    readStream.pipe(new BSONStream()).on('data', function (obj) {
        console.log(obj);
    });

};

run();