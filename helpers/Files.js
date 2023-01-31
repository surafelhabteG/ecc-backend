const fs = require("fs")
const Jimp = require("jimp");
const base64 = require('node-base64-image');
const path = require('path');

const { uuid } = require('uuidv4');

const staticPath = path.join(process.cwd(),'public')

// convert base64 string into actual file.
const convertBase64 = async (data, fileName, directory = 'ids',isImage = true, isSlideImage = false, extenstion = 'jpeg') => {
    
    try {

        var url = isSlideImage ? `${staticPath}/images/slide/` : `${staticPath}/uploads/${directory}/`;

        data = data.split("base64,");

        if (!fs.existsSync(url)) {
            fs.mkdirSync(url, { recursive: true });   
        } 

        const buffer = Buffer.from(data[1], "base64");
        let result = await base64.decode(buffer, { fname: `${url}${fileName}`, ext: isImage ? extenstion : 'pdf' });

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

    } catch(err) {
        return {
            status: false, message: err.message
        }
    }
}

const deleteFiles = (req, res, isDirectory = false) => {
    try {

        if (fs.existsSync(`${staticPath}/${req.body.url}`)) {

            if(isDirectory){
                fs.rmSync(`${staticPath}/${req.body.url}`,{recursive: true});

            } else {
                fs.unlinkSync(`${staticPath}/${req.body.url}`);

            }

            return { status: true, message: `file deleted successfully.` };
         
        } else {
            return { status: isDirectory ? false : true, message: `file does not exist.` };  
        }

    } catch(err){
        return { status: false, message: err.message };
    }
}

module.exports = {
    convertBase64,
    deleteFiles
};