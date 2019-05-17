const BsonStream = require("bson-stream");
const bson = require("bson");
const through2 = require("through2");
const parseDuration = require("parse-duration");
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

    let { bsonFile, outPath } = await prompt([
        {
            type: "select",
            name: "bsonFile",
            choices: getAllFiles(path),
            message: "Select a BSON file to filter"
        },
        {
            type: "input",
            name: "outPath",
            message: "What file would you like to output to?",
            validate(path) { return (path.trim().length > 0) ? true : "Please enter a file path" }
        }
    ]);

    let { filterBy } = await prompt({
        type: "select",
        name: "filterBy",
        choices: [
            { message: "Guild ID", value: "guild_id" },
            { message: "Guild IDs", value: "guild_ids" },
            { message: "Creation date", value: "creation_date" }
        ],
        message: "What would you like to filter the data by?"
    })

    let filter;
    if (filterBy === "guild_id") {
        ({ filter } = await prompt({
            type: "numeral",
            name: "filter",
            message: "What Guild ID would you like to filter by?",
            validate(id) {
                return id > 0 ? true : "Enter a valid guild ID!"
            }
        }))
    } else if (filterBy === "guild_ids") {
        ({ filter } = await prompt({
            type: "list",
            name: "filter",
            message: "What Guild IDs would you like to filter by?",
            validate(list) {
                list.forEach(id => {
                    if (isNaN(id) || +id <= 0) return "Enter a list of valid guild ids"
                })
                return true;
            },
            result(list) {
                return list.map(id => +id)
            }
        }))
    } else if (filterBy === "creation_date") {
        ({ filter } = await prompt({
            type: "input",
            name: "filter",
            message: "How far back would you like to filter by?",
            validate(duration) {
                try {
                    let ms = parseDuration(duration)
                    if (ms <= 0) throw new Exception();
                    return true;
                } catch (e) {
                    return "Enter a valid time length!"
                }
            }
        }))
    }

    let { check } = await prompt({
        type: "confirm",
        name: "check",
        message: "Would you like to see the output of the data you have selected?"
    })

    let readStream = fs.createReadStream(bsonFile);

    let stream = readStream
        .pipe(new BsonStream())
        .pipe(streamFilter(data => {
            if (filterBy === "guild_id") return data._id === filter
            if (filterBy === "guild_ids") return filter.includes(data._id)
            if (filterBy === "creation_date") return new Date((Date.now() - parseDuration(filter))) <= new Date(data.creationDate)
        }))
        .pipe(through2.obj(function (obj, enc, callback) {
            if (check) console.log(obj)
            this.push(obj)
            callback()
        }))
        .pipe(through2.obj(function (obj, enc, callback) {
            this.push(bson.serialize(obj))
            callback()
        }))
        .pipe(fs.createWriteStream(outPath))

};

const streamFilter = function (test) {
    return through2.obj(function (obj, enc, callback) {
        if (test(obj)) this.push(obj)
        callback();
    })
}


run();