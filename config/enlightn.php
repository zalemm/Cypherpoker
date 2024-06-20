/*
|--------------------------------------------------------------------------
| Credentials
|--------------------------------------------------------------------------
|
| The following credentials are used to share your Enlightn report with
| the Enlightn Github Bot. This allows the bot to compile the report
| and add review comments on your pull requests.
|
*/
'credentials' => [
    'username' => env('ENLIGHTN_USERNAME'), // your registered email
    'api_token' => env('ENLIGHTN_API_TOKEN'), // your project API token
],

// Set this value to your Github repo for integrating with the Enlightn Github Bot
// Format: "myorg/myrepo" like "laravel/framework".
'github_repo' => env('ENLIGHTN_GITHUB_REPO'),
