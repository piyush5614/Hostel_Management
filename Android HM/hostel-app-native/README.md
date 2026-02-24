# Hostel App Native

This project is a Capacitor application that wraps an existing web application for deployment as a native Android and iOS app. Below are the instructions for setting up and running the project.

## Prerequisites

- Node.js (version 12 or later)
- npm (Node package manager)
- Java Development Kit (JDK)
- Android Studio
- Xcode (for iOS development)

## Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd hostel-app-native
   ```

2. Install the dependencies:

   ```
   npm install
   ```

3. Set up the Android platform:

   ```
   npx cap add android
   ```

4. Set up the iOS platform:

   ```
   npx cap add ios
   ```

## Running the Application

### Android

1. Open the Android project in Android Studio:

   ```
   npx cap open android
   ```

2. Build and run the application on an Android device or emulator.

### iOS

1. Open the iOS project in Xcode:

   ```
   npx cap open ios
   ```

2. Build and run the application on an iOS device or simulator.

## Building for Production

To build the application for production, use the following command:

```
npx cap sync
```

This command will ensure that all changes are reflected in the native projects.

## Publishing

Follow the respective guidelines for publishing your app to the Google Play Store and Apple App Store.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.