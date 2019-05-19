# Build script used by our jenkins server to build each CLI tool
# This assumes that pug@4.4.0 is installed globally on the system
# and builds each CLI tool for Windows and Linux using Node.js v10
#
# All builds files are outputted in the "bin" directory

# Build the filter CLI tool
cd filter && npm install && npm run-script build

# Build the restore CLI tool
cd restore && npm install && npm run-script build