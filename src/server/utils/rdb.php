<?php

   /**
   * @file A JSON-RPC 2.0 API for remote CypherPoker.JS database (MySQL) access.
   * This allows the database to be stored remotely from the account management
   * system.
   */

   //External API access key:
   $_accessKey = "DATABASE_ACCESS_KEY";

   //Database settings:
   $db = NULL; //active database connection
   $_dbhost = "localhost"; //the MySQL database host URL
   $_dbname = "database_name"; //the MySQL database name
   $_dbuser = "database_user"; //the authorized database user account
   $_dbpw = "database_password"; //password for $_dbuser
   $_db_maxmb = 20; //maximum database size in megabytes

   /**
   * Creates the database and any associated table(s). This function is usually invoked
   * by calling the script with an "install" parameter. E.g. http://somehost.com/rdb.php?install
   */
   function createDatabase() {
      global $db, $_dbhost, $_dbuser, $_dbpw, $_dbname;
      $db = new mysqli($_dbhost, $_dbuser, $_dbpw);
      if ($db -> connect_error) {
        die("Connection failed: " . $conn->connect_error);
        return (false);
      }
      printf("Creating database \"".$_dbname."\"...<br/>");
      $querySQL = "CREATE DATABASE IF NOT EXISTS ".$_dbname;
      printf("Database created.<br/>");
      $result = $db -> query($querySQL);
      printf("Creating tables...<br/>");
      mysqli_select_db($db, $_dbname);
      $querySQL = "CREATE TABLE IF NOT EXISTS `accounts` (
        `primary_key` int(11) NOT NULL AUTO_INCREMENT,
        `type` text NOT NULL COMMENT 'The cryptocurrency type',
        `network` text NOT NULL COMMENT 'Cryptocurrency subnetwork',
        `chain` bigint(20) NOT NULL DEFAULT '-1' COMMENT 'HD derivation path first parameter',
        `addressIndex` bigint(20) NOT NULL DEFAULT '-1' COMMENT 'HD derivation path second parameter',
        `address` text NOT NULL COMMENT 'Account (cryptocurrency) address',
        `pwhash` text NOT NULL COMMENT 'SHA256 hash of password',
        `balance` text NOT NULL COMMENT 'Account balance in smallest denomination',
        `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date/Time this row was created.',
        PRIMARY KEY (`primary_key`)
     ) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;";
     $result = $db -> query($querySQL);
     //Uncomment the following line to see any errors:
     //echo(mysqli_error($db)."<br/>");
     printf("Tables created.<br/>");
   }

   /**
   * Returns the client IP address from the most reliable
   * source available.
   */
   function getClientIP() {
       $ip = '';
       if (isset($_SERVER['REMOTE_ADDR'])) {
           $ip = $_SERVER['REMOTE_ADDR'];
       } else if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
           $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
       } else if (isset($_SERVER['HTTP_X_FORWARDED'])) {
           $ip = $_SERVER['HTTP_X_FORWARDED'];
       } else if (isset($_SERVER['HTTP_FORWARDED_FOR'])) {
           $ip = $_SERVER['HTTP_FORWARDED_FOR'];
       } else if (isset($_SERVER['HTTP_FORWARDED'])) {
           $ip = $_SERVER['HTTP_FORWARDED'];
       } else if (isset($_SERVER['HTTP_CLIENT_IP'])) {
          $ip = $_SERVER['HTTP_CLIENT_IP'];
       } else {
           $ip = '0.0.0.0';
       }
       return ($ip);
   }

   /**
   * Returns the size of the database.
   *
   * @return {number} The size of the database in megabytes, precise to 8 decimal points.
   */
   function getDBSize() {
      global $_dbname, $db;
      $querySQL = "SELECT table_name AS `Table`, round(((data_length + index_length) / 1024 / 1024), 8) `sizeMB` FROM information_schema.TABLES WHERE table_schema = '".$_dbname."' AND table_name = 'accounts';";
      $result = $db -> query($querySQL);
      $row = $result -> fetch_object();
      $size = (float) $row -> sizeMB;
      return ($size);
   }

   /**
   * Returns the native date-time of the latest (newest) "updated" field in the database.
   *
   * @return {number} The size of the database in megabytes, precise to 8 decimal points.
   */
   function getLastRequest() {
      global $_dbname, $db;
      $querySQL = "SELECT * FROM `accounts` WHERE `updated`=(SELECT MAX(updated) FROM `accounts`);";
      $result = $db -> query($querySQL);
      if (mysqli_num_rows($result) == 0) {
         return (0);
      } else {
         $row = $result -> fetch_object();
         $date = strtotime($row -> updated);
         return ($date);
      }
   }

   /**
   * Returns the number of seconds elapsed since the last update of any account in the database.
   *
   * @return {number} The number of seconds elapsed since the last update of any account in the database.
   */
   function getElapsedUpdateSeconds() {
      $date = new DateTime('NOW');
      //unix timestamps are in seconds...
      $elapsedSeconds = ($date->getTimestamp()) - getLastRequest();
      if ($elapsedSeconds < 0) {
         $elapsedSeconds = 0;
      }
      return ($elapsedSeconds);
   }

   /**
   * Opens the database connection, referenced by $db, using the
   * global database settings above.
   *
   * @return {Boolean} True if the database connection was successfully
   * established, false otherwise.
   */
   function openDatabase() {
      global $_dbhost;
      global $_dbuser;
      global $_dbpw;
      global $_dbname;
      global $db;
      $db = new mysqli($_dbhost, $_dbuser, $_dbpw, $_dbname);
      if ($db -> connect_error) {
        //die("Connection failed: " . $conn->connect_error);
        return (false);
      }
      return (true);
   }

   /**
   * Sets the default response headers. This function MUST be called prior
   * to attempting to send the response.
   */
   function setDefaultHeaders() {
      //CORS
      header("Access-Control-Allow-Origin: *");
      //content type
      header("Content-Type: application/json-rpc");
   }

   /**
   * Sends a JSON-RPC 2.0 result response to the client.
   *
   * @param {Object} $result The result data to include in the response.
   * @param {Object} $requestObj The requesting JSON-RPC 2.0 object. Parts of
   * this object are included in the response.
   */
   function sendResult($result, $requestObj) {
      global $db;
      $responseObj = new stdClass();
      $responseObj -> jsonrpc = "2.0";
      if (isset($requestObj -> id)) {
         $responseObj -> id = $requestObj -> id;
      } else {
         list($usecfl, $sec) = explode(" ", microtime());
         list($zero, $usec) = explode(".", $usecfl);
         $responseObj -> id = $sec.$usec;
      }
      $responseObj -> result = $result;
      if ($db != NULL) {
         $db -> close();
      }
      echo (json_encode($responseObj));
   }

   /**
   * Sends a JSON-RPC 2.0 error response to the client.
   *
   * @param {Number} $code The numeric error code of the error, usually negative.
   * @param {String} $message The human-readable error message of the error.
   * @param {Object} $requestObj The requesting JSON-RPC 2.0 object. Parts of
   * this object are included in the response.
   * @param {Object} [data=null] Optional additional data to include with the
   * error response in the <code>data</code> property.
   */
   function sendError($code, $message, $requestObj, $data=NULL) {
      global $db;
      $responseObj = new stdClass();
      $responseObj -> jsonrpc = "2.0";
      if (isset($requestObj -> id)) {
         $responseObj -> id = $requestObj -> id;
      } else {
         list($usecfl, $sec) = explode(" ", microtime());
         list($zero, $usec) = explode(".", $usecfl);
         $responseObj -> id = $sec.$usec;
      }
      $responseObj -> error = new stdClass();
      $responseObj -> error -> message = $message;
      $responseObj -> error -> code = $code;
      if ($data != NULL) {
         $responseObj -> data = $data;
      }
      if ($db != NULL) {
         $db -> close();
      }
      echo (json_encode($responseObj));
   }

   /**
   * Determines if an input string starts with a specific string.
   *
   * @param {String} $input The string within which to find the $start
   * @param {String} $start The string that should appear at the start of $input
   *
   * @return {Boolean} True if the $input string starts with $start, false otherwise.
   */
   function startsWith($input, $start) {
     $length = strlen($start);
     return (substr($input, 0, $length) === $start);
   }

   /**
   * Determines if an input string ends with a specific string.
   *
   * @param {String} $input The string within which to find the $end
   * @param {String} $end The string that should appear at the end of $input
   *
   * @return {Boolean} True if the $input string ends with $end, false otherwise.
   */
   function endsWith($input, $end) {
       $length = strlen($end);
       if ($length == 0) {
           return true;
       }
       return (substr($input, -$length) === $end);
   }

   /**
   * Checks to see if the request is allowed (usually before processing).
   *
   * @param {Object} $requestObj The parsed JSON-RPC 2.0 request object.
   *
   * @return {Boolean} True if the processing of the request may proceed, false
   * if it's disallowed.
   */
   function requestAllowed($requestObj) {
      global $_accessKey;
      $signature = $requestObj -> params -> signature;
      $message = json_encode($requestObj -> params -> message);
      $compare = hash_hmac("SHA256", $message , $_accessKey , false);
      if (strcmp($signature, $compare) == 0) {
         return (true);
      }
      return (false);
   }

   /**
   * Handles an incoming HTTP/S request by setting the default response
   * headers and calling {@link processRPCRequest};
   */
   function handleHTTPRequest() {
      setDefaultHeaders(); //must do this before sending any response!
      processRPCRequest(file_get_contents("php://input"));
   }

   /**
   * Processes a JSON-RPC 2.0 request, either invoking a recognized API
   * function (method), or returning an error.
   *
   * @param {String} $requestStr The unparsed POST message body received
   * with the request.
   */
   function processRPCRequest($requestStr) {
      global $db, $_db_maxmb, $_accessKey;
      $request = json_decode($requestStr);
      if ($request != NULL) {
         //JSON correctly parsed
         if (isset($request -> jsonrpc) == false) {
            sendError(-32600, "Not a recognized JSON-RPC 2.0 request object.", $request);
            return;
         }
         if ($request -> jsonrpc != "2.0") {
            sendError(-32600, "Wrong JSON-RPC version. Must be \"2.0\".", $request);
            return;
         }
         if (isset($request -> method) == false) {
            sendError(-32600, "Method not specified.", $request);
            return;
         }
         if (isset($request -> params) == false) {
            sendError(-32602, "Required \"params\" not found.", $request);
            return;
         }
         if (requestAllowed($request) == false) {
            sendError(-32003, "Bad signature.", $request);
            return;
         }
         switch ($request -> method) {
            case "walletstatus":
               if (openDatabase()) {
                  $resultObj = new stdClass();
                  $resultObj -> bitcoin = new stdClass();
                  $resultObj -> bitcoin -> main = new stdClass();
                  $resultObj -> bitcoin -> test3 = new stdClass();
                  $resultObj -> db = new stdClass();
                  $resultObj -> db -> sizeMB = getDBSize();
                  $resultObj -> db -> maxMB = $_db_maxmb;
                  $resultObj -> db -> elapsedUpdateSeconds = getElapsedUpdateSeconds();
                  $querySQL = "SELECT * FROM `accounts` WHERE `type`=\"bitcoin\" AND `network`=\"main\" ORDER BY `chain` DESC LIMIT 1;";
                  $result = $db -> query($querySQL);
                  if (mysqli_num_rows($result) == 0) {
                     $resultObj -> bitcoin -> main -> startChain = 0;
                  } else {
                     $row = $result -> fetch_object();
                     $resultObj -> bitcoin -> main -> startChain = $row -> chain;
                  }
                  $querySQL = "SELECT * FROM `accounts` WHERE `type`=\"bitcoin\" AND `network`=\"main\" ORDER BY `addressIndex` DESC LIMIT 1;";
                  $result = $db -> query($querySQL);
                  if (mysqli_num_rows($result) == 0) {
                     $resultObj -> bitcoin -> main -> startIndex = 0;
                  } else {
                     $row = $result -> fetch_object();
                     $resultObj -> bitcoin -> main -> startIndex = $row -> addressIndex;
                  }
                  $querySQL = "SELECT * FROM `accounts` WHERE `type`=\"bitcoin\" AND `network`=\"test3\" ORDER BY `chain` DESC LIMIT 1;";
                  $result = $db -> query($querySQL);
                  if (mysqli_num_rows($result) == 0) {
                     $resultObj -> bitcoin -> test3 -> startChain = 0;
                  } else {
                     $row = $result -> fetch_object();
                     $resultObj -> bitcoin -> test3 -> startChain = $row -> chain;
                  }
                  $querySQL = "SELECT * FROM `accounts` WHERE `type`=\"bitcoin\" AND `network`=\"test3\" ORDER BY `addressIndex` DESC LIMIT 1;";
                  $result = $db -> query($querySQL);
                  if (mysqli_num_rows($result) == 0) {
                     $resultObj -> bitcoin -> test3 -> startIndex = 0;
                  } else {
                     $row = $result -> fetch_object();
                     $resultObj -> bitcoin -> test3 -> startIndex = $row -> addressIndex;
                  }

                  sendResult($resultObj, $request);
               } else {
                  sendError(-32603, "Could not connect to database.", $request);
               }
               break;
            case "getrecord":
               if (openDatabase()) {
                  if (getDBSize() >= $_db_maxmb) {
                     sendError(-32603, "Database limit exceeded.", $request);
                     return;
                  }
                  //get up to 2 latest rows for specified account
                  $querySQL = "SELECT * FROM `accounts` WHERE `address`=\"".cleanParameter($request -> params -> message -> address)."\" ORDER BY `primary_key` DESC LIMIT 2;";
                  $result = $db -> query($querySQL);
                  if ($result == false) {
                     sendError(-32603, $querySQL, $request);
                     return;
                  }
                  if (mysqli_num_rows($result) == 0) {
                     sendError(-32602, "No matching account.", $request);
                     return;
                  } else {
                     $rows = array();
                     while ($row = mysqli_fetch_assoc($result)) {
                        array_push($rows, $row);
                     }
                     sendResult($rows, $request);
                  }
               } else {
                  sendError(-32603, "No account.", $request);
               }
               break;
            case "putrecord":
               if (openDatabase()) {
                  if (getDBSize() >= $_db_maxmb) {
                     sendError(-32603, "Database limit exceeded.", $request);
                     return;
                  }
                  $querySQL = "INSERT INTO `accounts` (`type`, `network`, `chain`, `addressIndex`, `address`, `pwhash`, `balance`,`updated`) VALUES (";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> type)."\",";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> network)."\",";
                  $querySQL .= cleanParameter($request -> params -> message -> chain).",";
                  $querySQL .= cleanParameter($request -> params -> message -> addressIndex).",";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> address)."\",";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> pwhash)."\",";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> balance)."\",";
                  $querySQL .= "\"".cleanParameter($request -> params -> message -> updated)."\"";
                  $querySQL .= ");";
                  $result = $db -> query($querySQL);
                  if ($result == false) {
                     sendError(-32603, "The database returned an error.", $request, $db -> error);
                     return;
                  }
                  sendResult("OK", $request);
               } else {
                  sendError(-32603, "Could not connect to database.", $request);
               }
               break;
            case "updaterecord":
               if (openDatabase()) {
                  if (getDBSize() >= $_db_maxmb) {
                     sendError(-32603, "Database limit exceeded.", $request);
                     return;
                  }
                  $querySQL = "UPDATE `accounts` SET `updated`=\"".cleanParameter($request -> params -> message -> updated)."\" WHERE `primary_key`=".cleanParameter($request -> params -> message -> primary_key).";";
                  $result = $db -> query($querySQL);
                  if ($result == false) {
                     sendError(-32603, "The database returned an error.", $request, $db -> error);
                     return;
                  }
                  sendResult("OK", $request);
               } else {
                  sendError(-32603, "Could not connect to database.", $request);
               }
               break;
            default:
               sendError(-32601, 'RPC method "'.$request -> method.'" not found.', $request);
               break;
         }
      } else {
         sendError(-32700, "Invalid JSON-RPC request.", $request, "OK");
      }
   }

   /**
   * Sanitizes an input parameter in order to prevent SQL injections.
   */
   function cleanParameter($param) {
      global $db;
      $returnVal = mysqli_real_escape_string($db, $param);
      return ($returnVal);
   }

   if (isset($_GET)) {
      if (isset($_GET["install"])) {
         printf ("Running installation...<br/>");
         createDatabase();
         printf ("Installation complete.");
      } else {
         //call default request handler
         handleHTTPRequest();
      }
   } else {
      handleHTTPRequest();
   }

?>
