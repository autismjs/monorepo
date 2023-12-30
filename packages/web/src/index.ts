import App from './pages/App';
import $node from './state/node.ts';
import { Router } from '../lib/ui.ts';
import PostView from './pages/PostView';

(async () => {
  Router.add(/\/(.*?)\/status\/(.*)/, new PostView());
  Router.add(/(.*?)/, new App());
  Router.update();
  $node.waitForStart();
  window.addEventListener('popstate', (e) => console.log(e));
})();
