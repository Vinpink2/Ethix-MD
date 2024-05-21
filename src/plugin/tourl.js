import { UploadFileUgu, TelegraPh } from '../uploader.js';
import { writeFile, unlink } from 'fs/promises';
import util from 'util';

const MAX_FILE_SIZE_MB = 60; // Maximum file size in megabytes

const tourl = async (m, gss) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const validCommands = ['tourl','url'];

  if (validCommands.includes(cmd)) {
    if (!m.quoted || !['imageMessage', 'videoMessage', 'audioMessage'].includes(m.quoted.mtype)) {
      return m.reply(`Send/Reply with an image, video, or audio to upload ${prefix + cmd}`);
    }

    try {
      const media = await m.quoted.download(); // Download the media from the quoted message
      if (!media) throw new Error('Failed to download media.');

      const fileSizeMB = media.length / (1024 * 1024); // Calculate file size in megabytes
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return m.reply(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      }

      const extension = getFileExtension(m.quoted.mtype);
      if (!extension) throw new Error('Unknown media type.');

      const filePath = `./${Date.now()}.${extension}`; // Save the media with proper extension
      await writeFile(filePath, media);

      let response;
      if (m.quoted.mtype === 'imageMessage') {
        response = await TelegraPh(filePath); // Pass the file path to TelegraPh
      } else {
        response = await UploadFileUgu(filePath); // Pass the file path to UploadFileUgu
      }

      const imageUrl = response.url || response; // Extract the URL from the response

      const message = {
        [m.quoted.mtype === 'imageMessage' ? 'image' : 'document']: { url: imageUrl },
        caption: `${imageUrl}`,
      };

      await m.reply(util.format(message)); // Send the media with the URL as the caption
      await unlink(filePath); // Delete the downloaded media file
    } catch (error) {
      console.error('Error processing media:', error);
      m.reply('Error processing media.');
    }
  }
};

// Function to get the file extension based on media type
const getFileExtension = (mtype) => {
  switch (mtype) {
    case 'imageMessage':
      return 'jpg';
    case 'videoMessage':
      return 'mp4';
    case 'audioMessage':
      return 'mp3';
    default:
      return null;
  }
};

export default tourl;