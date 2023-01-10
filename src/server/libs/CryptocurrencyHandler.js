/**
* @file Generic cryptocurrency handler class to be extended by specific implementations.
*
* @version 0.5.0
* @author Patrick Bay
* @copyright MIT License
*/

const EventEmitter = require("events");
const request = require("request");
const progress = require("request-progress");
const {spawn} = require("child_process");
const fs = require("fs");
const JSZip = require("jszip");
const tar = require("tar");
const url = require("url");
const path = require("path");
const homeDir = require("os").homedir();

/**
* @class Generic cryptocurrency handler prototype class. Includes functionality for both
* native clients and remote APIs.
* @extends EventEmitter
*/
module.exports = class CryptocurrencyHandler extends EventEmitter {

   /**
   * Creates a new instance of the native cryptocurrency handler prototype.
   *
   * @param {Object} serverRef A reference to the server-exposed objects made available
   * to this and the extending class.
   * @param {Object} hConfig The configuration data for the handler instance, usually
   * a child object of the global application config. This is assigned to the
   * [handlerconfig]{@link CryptocurrencyHandler#handlerconfig} property.
   */
   constructor(serverRef, hConfig) {
      super();
      this._server = serverRef;
      this._handlerConfig = hConfig;
   }

   /**
   * @property {Object} server A reference to the server-exposed objects made available
   * to this class at instantiation time.
   * @readonly
   */
   get server() {
      return (this._server);
   }

   /**
   * @property {Object} handlerConfig The configuration data for the handler instance, usually
   * a child object of the global configuration data (<code>[server]{@link CryptocurrencyHandler#server}.config</code>).
   * @readonly
   */
   get handlerConfig() {
      return (this._handlerConfig);
   }

   /**
   * @property {Object} config The global configuration data for the application, usually
   * the [server]{@link CryptocurrencyHandler#server}.config object.
   * @readonly
   */
   get config () {
      return (this.server.config);
   }

   /**
   * Creates a new cryptocurrency wallet. This function must be overriden by
   * the extending class.
   *
   * @param {String} [APIType="*"] The cryptocurrency type of API endpoint
   * configuration to use for an API call.
   * @param {String} [network=null] The sub-network, if applicable, for which to
   * create the wallet..
   */
   makeNewWallet(APIType="*", network=null) {
      throw (new Error ("makeNewWallet function not implemented in extending class."));
   }

   /**
   *
   * Creates a HD (Hierarchical Deterministic) Bitcoin wallet from which addresses can be
   * derived. This function must be overriden by the extending class.
   *
   * @param {String} privKey A private key from which to derive the wallet.
   *
   * @return {Object} A wallet object containing both the public and private keys
   * from which addresses can be derived (using <code>derivePath</code>).
   */
   makeHDWallet(privKey) {
      throw (new Error ("makeHDWallet function not implemented in extending class."));
   }

   /**
   * Returns the derived wallet object (or its address), of a root wallet object.
   * This function must be overriden by the extending class.
   *
   * @param {String} path The derivation path of the wallet to return.
   * @param {String} [network="*"] The sub-network for which to get the address.
   * @param {Boolean} [addressOnly=false] If true, only the address is returned otherwise
   * the wallet object is returned.
   * @param {Boolean} [nativeAddress=false] Used with derivative cryptocurrencies such as
   * Bitcoin Cash where the returned address may standard (legacy), or native to the
   * derived cryptocurrency (if true). This parameter is is only used when when
   * <code>addressOnly=true</code> is implementation specific (it may be be ignored).
   *
   * @return (Object|String) The derived wallet object or its address property if <code>addressOnly=true</code>.
   */
   getDerivedWallet(path, network="*", addressOnly=false, nativeAddress=false) {
      throw (new Error ("getDerivedWallet function not implemented in extending class."));
   }

   /**
   * Returns the address of a wallet object.
   *
   * @param {Object} walletObj A wallet data object.
   * @param {String} [network="*"] The sub-network for which to get the address.
   *
   */
   getAddress(walletObj, network="*") {
      throw (new Error ("getAddress function not implemented in extending class."));
   }

   /**
   * Invokes the BlockCypher balance ("address-full") API endpoint to retrieve information about
   * an address, including its balances. This function must be overriden by the extending class.
   *
   * @param {String} addressOrPath An address or derivation path.
   * @param {String} APIType The API endpoint to use for retrieving address.
   * @param {String} [network=null] The network or API sub-type to which the <code>addressOrPath</code>
   * belongs.
   *
   */
   getBlockchainBalance(addressOrPath, APIType="*", network=null) {
      throw (new Error ("getBlockchainBalance function not implemented in extending class."));
   }

   /**
   * Cashes out from the configured cashout wallet to a specific address.
   * This function must be overriden by the extending class.
   *
   * @param {String} toAddress The address to cash out to.
   * @param {String|Number} amount The amount to cash out. The miner <code>fees</code> will
   * be deducted from this amount.
   * @param {String|Number} [fees=null] The miner fees to deduct from <code>amount</code> and
   * include with the transaction. If <code>null</code>, the default fee defined for the
   * <code>APIType</code> and <code>network</code> will be used.
   * @param {String} [APIType="*"] The main cryptocurrency API type.
   * @param {String} [network=null] The cryptocurrency sub-network, if applicable, for the
   * transaction.
   */
   async cashoutToAddress(toAddress, amount, fees=null, APIType="*", network=null) {
      throw (new Error ("cashoutToAddress function not implemented in extending class."));
   }

   /**
   * Sends a transaction from a (derived) wallet to a specific address with customizable fee.
   * This function must be overriden by the extending class.
   *
   * @param {Object|String} from The wallet object or wallet derivation path from which to send the funds.
   * @param {String} toAddress The target or receipient address.
   * @param {String|Number} amount The amount to send to <code>toAddress</code> in the lowest
   * denomination of the associated cryptocurrency.
   * @param {String|Number} [fee=null] The transaction fee to include in the transaction. The fee
   * is <i>in addition</i> to the <code>amount</code> being sent and is likewise denoted in
   * the smallest denomination for the cryptocurrency.
   * @param {String} [APIType="*"] The main API endpoint to use when posting the transaction.
   * @param {String} [network=null] The network or API sub-type for the transaction.
   *
   * @async
   *
   */
   async sendTransaction(from, toAddress, amount, fee=null, APIType="*", network=null) {
      throw (new Error ("sendTransaction function not implemented in extending class."));
   }

   /**
   * Checks the installation of the native client and optionally (re-)installs it
   * if not found from the root URL specified in the extending class' <code>downloadRootURL</code>.
   *
   * @param {Array} installFiles Indexed array of files to check for and optionally install, excluding
   * any path information.
   * @param {String} installDirectory The installation directory for the files specified in <code>installFiles</code>.
   * @param {Boolean} [autoInstall=true] If true, the client is automatically installed if a valid installation
   * does not currently exist.
   *
   * @return {Boolean} True if the installation exists and appears valid (or can be successfully completed),
   * false otherwise.
   *
   * @async
   */
   async checkInstall(installFiles, installDirectory, autoInstall=true) {
      if (installDirectory == null) {
         installDirectory = this.installDir;
      }
      if (installDirectory == null) {
         throw (new Error("Installation directory not specified (null)."));
      }
      if (this.server.hostEnv["embedded"] == true) {
         installDirectory = path.resolve(this.server.hostEnv.dir.server + installDirectory);
      }
      //check installation directory
      if (fs.existsSync(installDirectory) == false) {
         if (autoInstall == false) {
            return (false);
         }
         fs.mkdirSync(installDirectory);
      }
      if (this.allFilesExist(installFiles, installDirectory) == false) {
         if (autoInstall == false) {
            return (false);
         }
         try {
            var sourceURL = this.handlerConfig.downloads[process.platform];
            var parsed = url.parse(sourceURL);
            var fileName = path.basename(parsed.pathname);
            var downloadPath = path.join (homeDir, fileName);
            var result = await this.downloadFile(sourceURL, downloadPath);
            var result = await this.unzipFiles(installFiles, downloadPath, installDirectory);
            if (result == false) {
               return (false);
            }
         } catch (err) {
            console.error(err);
            return (false);
         }
      }
      return (true);
   }

   /**
   * Checks for the existence of files at a specified path.
   *
   * @param {Array} fileList A list of file names to check for (do not include
   * any path information).
   * @param {String} installPath The path / folder / directory to check for
   * the existince of the files specified in the <code>fileList</code> parameter.
   *
   * @return {Boolean} True if all of the files specified in the <code>fileList</code>
   * exist in the <code>installPath</code>, false otherwise.
   *
   * @todo Add optional checksum / hash signature / file integrity checks.
   */
   allFilesExist(fileList, installPath) {
      for (var count=0; count < fileList.length; count++) {
         var filePath = path.join (installPath, fileList[count]);
         if (fs.existsSync(filePath) == false) {
            return (false);
         }
      }
      return (true);
   }

   /**
   * Downloads a file from a URL to a local location.
   *
   * @param {String} sourceURL The source or remote URL from which to download the
   * file.
   * @param {String} targetPath The local path, including the filename, to download
   * the file to.
   *
   * @return {Promise} The returned promise resolves when the file has been fully downloaded
   * to the target location or rejected with a standard <code>Error</code> object
   * if the download fails.
   */
   downloadFile(sourceURL, targetPath) {
      var promise = new Promise((resolve, reject) => {
         progress(request(sourceURL, (error, response, body) => {
         })).on("progress", (infoObj) => {
            infoObj.sourceURL = sourceURL;
            infoObj.targetPath = targetPath;
            infoObj.phase = "download";
            this.emit("progress", infoObj);
         }).on("error", (error) => {
            reject(error);
         }).on("end", (error) => {
            resolve(true);
         }).pipe(fs.createWriteStream(targetPath));
      });
      return (promise);
   }

   /**
   * Unzips/extracts specified files in a zip, gzip, or tarball archive to an output location.
   *
   * @param {Array} fileList A list of files to extract from the <code>archPath</code> file.
   * Each file in this array should contain a full path (i.e. include folders) unless it's
   * a zip file in which case only the file name(s) are also accepted.
   * @param {String} archPath The path to the archive file to decompress. Should be either a zip,
   * gzip, or tar formatted file.
   * @param {String} outputPath The local filesystem path to extract the files to. For consistency,
   * all files in the archive are treated as being in a flat directory structure, even if found
   * within subdirectories (i.e. the directory structure in the archive is not maintained in the
   * output).
   *
   * @return {Promise} The promise resolves with <code>true</code> if the unzip / extract operation
   * succeeded successfully and rejects with an <code>Error</code> object if an
   * error was encountered.
   */
   unzipFiles(fileList, archPath, outputPath) {
      var promise = new Promise((resolve, reject) => {
         try {
            var extension = path.extname(archPath);
            extension = extension.split(".").join("").toLowerCase();
            if ((extension == "tar") || (extension == "gz")) {
               //tarballs are handled in the same way as gzip archives
               extension = "gzip";
            }
            switch (extension) {
               case "zip":
                  var zipData = fs.readFileSync(archPath);
                  JSZip.loadAsync(zipData).then((zip) => {
                     zip.forEach((filePath, fileObj) => {
                        var fileName = path.basename(filePath);
                        var match = false;
                        for (var count=0; count < fileList.length; count++) {
                           var currentFile = fileList[count];
                           if ((currentFile == fileName) || (currentFile == filePath)) {
                              match = true;
                              break;
                           }
                        }
                        if (match == true) {
                           var extractPath = path.join (outputPath, fileName);
                           var infoObj = new Object();
                           infoObj.fileName = fileName;
                           infoObj.targetPath = outputPath;
                           infoObj.phase = "install";
                           this.emit("progress", infoObj);
                           fileObj.async("nodebuffer").then((buff) => {
                              fs.writeFileSync(extractPath, buff);
                              infoObj = new Object();
                              infoObj.fileName = fileName;
                              infoObj.targetPath = outputPath;
                              infoObj.phase = "complete";
                              this.emit("progress", infoObj);
                              resolve(true);
                           });
                        }
                     });
                  });
                  break;
               case "gzip":
                  var completedFiles = 0;
                  //extract files individually, stripping out any path information as we go
                  for (var count=0; count < fileList.length; count++) {
                     var currentFile = fileList[count];
                     var options = new Object();
                     options.cwd = outputPath;
                     options.file = archPath;
                     options.strip = currentFile.split("/").length - 1; //strip out path data
                     tar.x (options, [currentFile], () => {
                        completedFiles++;
                        if (completedFiles == fileList.length) {
                           resolve(true);
                           return;
                        }
                     })
                  }
                  break;
               default:
                  reject (new Error("Unrecognized archive format \""+extension+"\"."));
                  break;
            }
         } catch (err) {
            reject (err);
         }
      });
      return (promise);
   }

   /**
   * Starts a native cryptocurrency client as a child process.
   *
   * @param {String} executablePath The path to the executable/binary file to launch.
   * @param {Array} paramaters Indexed list of command line parameters with which to launch
   * the executable / binary with.
   * @param {String} [workingDir=null] The working directory in which to launch the executable.
   * If not specified or null, the default working directory is assumed.
   *
   * @return (child_process) A native child process in which the executable is running. Listeners
   * are typically added to the <code>stdout</code> and <code>stderr</code> outputs to monitor
   * the process' status.
   */
   startNativeClient(executablePath, paramaters, workingDir=null) {
      var options = new Object();
      if (workingDir != null) {
         options.cwd = workingDir;
      } else {
         options.cwd = ".";
      }
      options.windowsHide = true; //hide console window
      if (this.server.hostEnv.embedded == true) {
         options.cwd = path.resolve(this.server.hostEnv.dir.server + options.cwd);
      }
      try {
         var childProc = spawn(executablePath, paramaters, options);
      } catch (err) {
         console.error (err);
      }
      return (childProc);
   }

}
