import App from './pages/App';
import $node from './state/node.ts';
import { Router } from '../lib/ui.ts';
import PostView from './pages/PostView';

(async () => {
  Router.add(/\/(.*?)\/status\/(.*)/, new PostView());
  Router.add(/(.*?)/, new App());
  console.log((await $node.node.db.db.getPosts()).length);
  $node.waitForStart();
  console.log(await $node.node.db.db.getStats());
})();
