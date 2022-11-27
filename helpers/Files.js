const fs = require("fs")
const Jimp = require("jimp");
const base64 = require('node-base64-image');

// convert base64 string into actual file.
async function convertBase64(data, fileName, directory = 'ids',isImage = true) {
    try {

        var url = `${staticPath}/uploads/${directory}/`;
        data = data.split("base64,");

        // if (data[0].includes('data:image')) {

            if (!fs.existsSync(url)) {
                fs.mkdirSync(url, { recursive: true });   
            } 

            const buffer = Buffer.from(data[1], "base64");
            let result = await base64.decode(buffer, { fname: `${url}${fileName}`, ext: isImage ? 'jpeg' : 'pdf' });

            if(result == 'file written successfully to disk'){
                if(isImage){
                    Jimp.read(`${url}${fileName}.jpeg`)
                    .then(image => {
                        return image.quality(40).write(`${url}${fileName}.jpeg`);
                        
                    }).catch(err => {
                        return {
                            status: false, message: err.message
                        };
                    });
                } else {
                    return {
                        status: true, message: 'successfully upload file.'
                    };
                }
                
            } else {
                return {
                    status: false, message: 'unable to upload file.'
                };
            }

        // } else {
        //     return {
        //         status: false, message: 'Only image is allowed to upload. please try again.'
        //     }
        // }

    } catch(err) {
        return {
            status: false, message: err.message
        }
    }
}

function deleteFiles(req, res, isDirectory = false){
    try {

        if (fs.existsSync(`${staticPath}/${req.body.url}`)) {

            if(isDirectory){
                fs.rmdirSync(`${staticPath}/${req.body.url}`,{recursive: true});

            } else {
                fs.unlinkSync(`${staticPath}/${req.body.url}`);

            }

            return { status: true, message: `file deleted successfully.` };
         
        } else {
            return { status: false, message: `file does not exist.` };  
        }

    } catch(err){
        return { status: false, message: err.message };
    }
}

module.exports = convertBase64;
module.exports = deleteFiles;