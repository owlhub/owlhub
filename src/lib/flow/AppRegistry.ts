/**
 * AppRegistry.ts
 * 
 * Initializes the app registry with all available apps.
 * This file imports all app implementations and registers them with the AppRegistry.
 */

// Import the AppRegistry
import { AppRegistry } from './AppNodeInterface';

// Import all app implementations
import HttpApp from './apps/HttpApp';
import GitHubApp from './apps/GitHubApp';
import DataTransformerApp from './apps/DataTransformerApp';
import GitlabApp from './apps/GitlabApp';

// Initialize the registry
const initializeAppRegistry = () => {
  // The apps are already registered in their respective files,
  // but we import them here to ensure they're included in the bundle

  // Force registration of apps if they haven't been registered yet
  if (AppRegistry.getAllApps().length === 0) {
    console.log('No apps registered, registering apps manually...');
    AppRegistry.registerApp(HttpApp);
    AppRegistry.registerApp(GitHubApp);
    AppRegistry.registerApp(DataTransformerApp);
    AppRegistry.registerApp(GitlabApp);
  }

  // Log the registered apps
  console.log('Registered apps:', AppRegistry.getAllApps().map(app => app.name));
};

export default initializeAppRegistry;
