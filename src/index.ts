import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  JupyterLab, JupyterLabPlugin, 
} from '@jupyterlab/application';

import {
    ToolbarButton,
    Dialog,
    ISplashScreen
} from '@jupyterlab/apputils';

import {
    Private,
} from '@jupyterlab/apputils';


import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  NotebookActions, NotebookPanel, INotebookModel
} from '@jupyterlab/notebook';

import '../style/index.css';

import { CommandRegistry } from '@phosphor/commands';

namespace CommandIDs {
  export const changeTheme = 'apputils:change-theme';

  export const loadState = 'apputils:load-statedb';

  export const recoverState = 'apputils:recover-statedb';

  export const reset = 'apputils:reset';

  export const resetOnLoad = 'apputils:reset-on-load';

  export const saveState = 'apputils:save-statedb';
}

/**
 * The plugin registration information.
 */
const runall: JupyterLabPlugin<void> = {
  activate,
  id: 'my-extension-name:buttonPlugin',
  autoStart: true
};


/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export
class ButtonExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  /**
   * Create a new extension object.
   */
  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    let callback = () => {
      NotebookActions.runAll(panel.content, context.session);
    };
    let button = new ToolbarButton({
      className: 'myButton',
      iconClassName: 'fa fa-fast-forward',
      onClick: callback,
      tooltip: 'Run All'
    });

    panel.toolbar.insertItem(0, 'runAll', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}

/**
 * Activate the extension.
 */
function activate(app: JupyterLab) {
  app.docRegistry.addWidgetExtension('Notebook', new ButtonExtension());
};



const splash: JupyterLabPlugin<ISplashScreen> = {
  id: '@jupyterlab/mysplash:splash',
  autoStart: true,
  provides: ISplashScreen,
  activate: app => {
    return {
      show: (light = true) => {
        const { commands, restored } = app;

        return Private.showSplash(restored, commands, CommandIDs.reset, light);
      }
    };
  }
};

//////
//

namespace Private {
  /**
   * Create a splash element.
   */
  function createSplash(): HTMLElement {
      const splash = document.createElement('div');
      const nyan = document.createElement('img');
      nyan.src = "http://www.stickpng.com/assets/thumbs/580b585b2edbce24c47b2db2.png" ;
      nyan.classList.add('nyan');
      nyan.classList.add('animated');
      nyan.classList.add('bounce');
      splash.appendChild(nyan);
      splash.id = 'jupyterlab-splash';


    return splash;
  }

  /**
   * A debouncer for recovery attempts.
   */
  let debouncer = 0;

  /**
   * The recovery dialog.
   */
  let dialog: Dialog<any>;

  /**
   * Allows the user to clear state if splash screen takes too long.
   */
  function recover(fn: () => void): void {
    if (dialog) {
      return;
    }

    dialog = new Dialog({
      title: 'Loading...',
      body: `The loading screen is taking a long time.
        Would you like to clear the workspace or keep waiting?`,
      buttons: [
        Dialog.cancelButton({ label: 'Keep Waiting' }),
        Dialog.warnButton({ label: 'Clear Workspace' })
      ]
    });

    dialog
      .launch()
      .then(result => {
        if (result.button.accept) {
          return fn();
        }

        dialog.dispose();
        dialog = null;

        debouncer = window.setTimeout(() => {
          recover(fn);
        }, 700);
      })
      .catch(() => {
        /* no-op */
      });
  }

  /**
   * The splash element.
   */
  const splash = createSplash();

  /**
   * The splash screen counter.
   */
  let splashCount = 0;

  /**
   * Show the splash element.
   *
   * @param ready - A promise that must be resolved before splash disappears.
   *
   * @param recovery - A command that recovers from a hanging splash.
   */
  export function showSplash(
    ready: Promise<any>,
    commands: CommandRegistry,
    recovery: string,
    light: boolean
  ): IDisposable {
    splash.classList.remove('splash-fade');
    splash.classList.toggle('light', light);
    splash.classList.toggle('dark', !light);
    splashCount++;

    if (debouncer) {
      window.clearTimeout(debouncer);
    }
    debouncer = window.setTimeout(() => {
      if (commands.hasCommand(recovery)) {
        recover(() => {
          commands.execute(recovery);
        });
      }
    }, 7000);

    document.body.appendChild(splash);

    return new DisposableDelegate(() => {
      ready.then(() => {
        if (--splashCount === 0) {
          if (debouncer) {
            window.clearTimeout(debouncer);
            debouncer = 0;
          }

          if (dialog) {
            dialog.dispose();
            dialog = null;
          }

          splash.classList.add('splash-fade');
          window.setTimeout(() => {
            document.body.removeChild(splash);
          }, 500);
        }
      });
    });
  }
}
/**
 * Export the plugins as default.
 */
// export default plugin;
const plugins: JupyterLabPlugin<any>[] = [
    runall,
    splash
];
export default plugins;

