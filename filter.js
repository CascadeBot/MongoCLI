const BsonStream = require("bson-stream")
const bson = require("bson")
const through2 = require("through2")
const parseDuration = require("parse-duration")
const fs = require("fs")
const path = require("path")
const chalk = require("chalk")
const { prompt } = require("enquirer")

const getAllFiles = dir =>
    fs.readdirSync(dir).reduce((files, file) => {
        const name = path.join(dir, file)
        const isDirectory = fs.statSync(name).isDirectory()
        return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name]
    }, [])

const getGuildFilter = async () => {
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

    let filter
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
                return true
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
                    if (ms <= 0) throw new Exception()
                    return true
                } catch (e) {
                    return "Enter a valid time length!"
                }
            }
        }))
    }

    return data => {
        if (filterBy === "guild_id") return data._id === filter
        if (filterBy === "guild_ids") return filter.includes(data._id)
        if (filterBy === "creation_date") return new Date((Date.now() - parseDuration(filter))) <= new Date(data.creationDate)
    }
}

const getPlaylistFilter = async () => {
    let { filterBy } = await prompt({
        type: "select",
        name: "filterBy",
        choices: [
            { message: "Playlist Scope", value: "scope" },
            { message: "Name", value: "name" },
            { message: "Guild ID", value: "guild_id" },
            { message: "User ID", value: "user_id" },
            { message: "Owner ID", value: "owner_id" },
        ],
        message: "What would you like to filter the data by?"
    })

    let filter
    if (filterBy === "guild_id") {
        ({ filter } = await prompt({
            type: "numeral",
            name: "filter",
            message: "What guild ID would you like to filter by?",
            validate(id) {
                return id > 0 ? true : "Enter a valid guild ID!"
            }
        }))
    } else if (filterBy === "user_id") {
        ({ filter } = await prompt({
            type: "numeral",
            name: "filter",
            message: "What user ID would you like to filter by?",
            validate(id) {
                return id > 0 ? true : "Enter a valid user ID!"
            }
        }))
    } else if (filterBy === "owner_id") {
        ({ filter } = await prompt({
            type: "numeral",
            name: "filter",
            message: "What owner ID would you like to filter by?",
            validate(id) {
                return id > 0 ? true : "Enter a valid owner ID!"
            }
        }))
    } else if (filterBy === "name") {
        let { caseInsensitive } = await prompt({
            type: "confirm",
            name: "caseInsensitive",
            message: "Filter by case-insensitive name?"
        })
        if (caseInsensitive) filterBy += "_insensitive"

            ({ filter }) = await prompt({
                type: "input",
                name: "filter",
                message: "Enter a name to filter by",
                validate(name) {
                    return (name.length > 0) ? true : "Enter a name!"
                }
            })
    } else if (filterBy === "scope") {
        ({ filter } = await prompt({
            type: "select",
            name: "filter",
            message: "What scope to filter by?",
            choices: [
                { message: "Guild", value: "GUILD" },
                { message: "User", value: "USER" }
            ]
        }))
    }


    return data => {
        if (filterBy === "scope") return data.scope === filter
        if (filterBy.startsWith("name")) {
            if (filterBy.endsWith("insensitive")) return data.name.toLowercase() === filter.toLowercase()
            return data.name === filter
        }
        if (filterBy === "guild_id") return (data.scope === "GUILD") && (data.ownerID === filter)
        if (filterBy === "user_id") return (data.scope === "USER") && (data.ownerID === filter)
        if (filterBy === "owner_id") return data.ownerID === filter
    }
}

const run = async () => {

    let { path } = await prompt({
        type: "input",
        message: "Enter a path to your backup directory",
        name: "path",
        validate(inputPath) {
            return (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) ? true : "Enter the path to a directory!"
        }
    })

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
            validate(path) { return (path.trim().length > 0 && path.endsWith(".bson")) ? true : "Please enter a file path with a .bson extension!" }
        }
    ])

    let { dataType } = await prompt({
        type: "select",
        name: "dataType",
        choices: [
            { message: "Guild", value: "guild" },
            { message: "Playlist", value: "playlist" },
        ],
        message: "What data type is the backup?"
    })

    let filter
    if (!dataType || dataType === "guild") {
        filter = await getGuildFilter()
    } else if (dataType === "playlist") {
        filter = await getPlaylistFilter()
    }

    let { check } = await prompt({
        type: "confirm",
        name: "check",
        message: "Would you like to see the output of the data you have selected?"
    })

    let readStream = fs.createReadStream(bsonFile)

    let originalNum = 0, filteredNum = 0

    let stream = readStream
        .pipe(new BsonStream())
        .pipe(streamFilter(data => {
            originalNum++
            return filter(data)
        }))
        .pipe(through2.obj(function (obj, enc, callback) {
            filteredNum++
            if (check) console.log(obj)
            this.push(obj)
            callback()
        }))
        .pipe(through2.obj(function (obj, enc, callback) {
            this.push(bson.serialize(obj))
            callback()
        }))
        .pipe(fs.createWriteStream(outPath))

    stream.on("finish", end => {
        console.log(chalk.cyan("Number of original records: " + originalNum))
        console.log(chalk.magenta("Number of filtered records: " + filteredNum))
        console.log(chalk.green("Outputted filtered records to: " + outPath))
    })

}

const streamFilter = function (test) {
    return through2.obj(function (obj, enc, callback) {
        if (test(obj)) this.push(obj)
        callback()
    })
}


run().catch(error => {
    console.error(error)
})