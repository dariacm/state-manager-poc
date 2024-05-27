import {createActor, assign, createMachine} from 'xstate';

// from db
const resourceIds = [1, 2, 3];

const workflowsMachine = createMachine({
  id: 'workflows',
  initial: 'Idle',
  types: {} as {
    events: { type: 'ContentImportedEvent'; resourceIds: number[] } | { type: 'TmAppliedEvent'; } | { type: 'MtAppliedEvent'; } | { type: 'TaskCompletedEvent'; };
  },
  states: {
    Idle: {
      on: {
        ContentImportedEvent: {
          target: 'ApplyTranslationMemory',
          actions: assign({
            resourceIds: ({ event }) => event.resourceIds
          })
        }
      }
    },
    ApplyTranslationMemory: {
      on: {
        TmAppliedEvent: {
          target: 'TranslateWithMachineTranslation',
        }
      }
    },
    TranslateWithMachineTranslation: {
      on: {
        MtAppliedEvent: {
          target: 'CreateReviewTask',
        }
      }
    },
    CreateReviewTask: {
      on: {
        TaskCompletedEvent: {
          target: 'End',
        }
      }
    },
    End: {
      type: 'final',
    }
  },
});

const actor = createActor(workflowsMachine);

actor.subscribe((snapshot) => {
  console.log('Value:', snapshot.value);
});

actor.start();

actor.send({ type: 'ContentImportedEvent', resourceIds });
actor.send({ type: 'TmAppliedEvent' });
actor.send({ type: 'MtAppliedEvent' });
actor.send({ type: 'TaskCompletedEvent' });