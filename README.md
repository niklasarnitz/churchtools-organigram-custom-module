# ChurchTools Organigram Custom Module

This project is a custom module for ChurchTools. It allows you to create an organigram of your church.

## Installing

You can just download the latest release and install it in ChurchTools.

**Important: The shorty of the custom module must be `organigram`.** But you may change the display name of the module.

## Running Locally in a dev environment

To run churchtools-organigram-custom-module locally, you need to create a .env file from the .env.example file and fill in the required values.

Then you can run the following commands:

```bash
npm install
npm start
```

The project will then be reachable via `http://localhost:3000`.
(Styling can be a bit broken, because ChurchTools' CSS is not loaded locally.)

## Building for production

To build the project for production, run the following command:

```bash
npm run build:module
```

You can then install the custom module in ChurchTools by uploading the `.zip` file.

**Important: The shorty of the custom module must be `organigram`.**
