// Determine whether is possible to write an image/text to the clipboard.
export function isClipboardWritingAllowed() {
  return new Promise(function (resolve, reject) {
    try {
      navigator.permissions
        .query({ name: "clipboard-write" })
        .then(function (status) {
          // PermissionStatus object
          // {
          //  onchange: null,
          //  state: "granted" (it could be as well `denied` or `prompt`)
          // }
          console.log(status);

          resolve(status.state == "granted");
        });
    } catch (error) {
      // This could be caused because of a Browser incompatibility or security error
      // Remember that this feature works only through HTTPS
      reject(error);
    }
  });
}
