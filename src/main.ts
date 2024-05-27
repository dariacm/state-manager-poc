import {createActor, fromPromise, setup, assign} from 'xstate';

// Hard-coded but the scoped IDs should be computed before and fed into the state machine
const resourceIds = [1, 2, 3];

// Hard-coded but these preferences should be stored in the DB
const integration = 'DeepL';
const taskTitle = 'My Task in Spanish';


const workflowsMachine = setup({actors: {
  applyTranslationMemoryFunction: fromPromise(
    async ({ input }: { input: { resourceIds: string[] } }) => {
      console.log(`applyTranslationMemoryFunction started with IDs ${input.resourceIds}`);
      // Logic to call Expert so that it can apply translation memory and send event when it's finished
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`applyTranslationMemoryFunction completed with IDs ${input.resourceIds}`);
    }
  ),
  translateWithMachineTranslation: fromPromise(
    async () => {
      console.log(`translateWithMachineTranslation started with integration ${integration}`);
      // Logic to call Expert so that it can apply machine translation and send event when it's finished
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`translateWithMachineTranslation completed with integration ${integration}`);
    }
  ),
  createTask: fromPromise(
    async ({ input }: { input: { type: 'Translation' | 'Review' } }) => {
      console.log(`createTask started with type ${input.type}`);
      // Logic to call Expert so that it can create a task and send event when the task is completed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`createTask completed with type ${input.type}`);
    }
  ),
  endWorkflow: fromPromise(
    async () => {
      console.log(`endWorkflow started`);
      // Logic to update the workflow run
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`endWorkflow completed`);
    }
  ),
}}).createMachine({
  id: 'workflows',
  initial: 'Idle',
  types: {} as {
    events: { type: 'ContentImportedEvent'; resourceIds: number[] } | { type: 'TmAppliedEvent'; } | { type: 'MtAppliedEvent'; } | { type: 'TaskCompletedEvent'; };
  },
  states: {
    Idle: {
      on: {
        ContentImportedEvent: {
          /**
           * When content is imported in Expert, Expert sends an event to Maestro
           * which sends an event to the state machine to trigger the next step
           * which in this case is applying translation memory
           */
          target: 'ApplyTranslationMemory',
          actions: assign({
            resourceIds: ({ event }) => event.resourceIds
          })
        }
      }
    },
    ApplyTranslationMemory: {
      description: 'Applies translation memory',
      invoke: {
        src: 'applyTranslationMemoryFunction',
        input: ({ context }) => ({
          resourceIds: context.resourceIds
        }),
      },
      on: {
        TmAppliedEvent: {
          target: 'TranslateWithMachineTranslation',
        }
      }
    },
    TranslateWithMachineTranslation: {
      description: 'Translates resources with machine translation selected',
      invoke: {
        src: 'translateWithMachineTranslation',
        input: {
          resourceIds,
          integration
        }
      },
      on: {
        MtAppliedEvent: {
          target: 'CreateReviewTask',
        }
      }
    },
    CreateReviewTask: {
      description: 'Creates task for human review',
      invoke: {
        src: 'createTask',
        input: ({ context }) => ({
          resourceIds: context.resourceIds,
          taskTitle,
          type: 'Review'
        }),
      },
      on: {
        TaskCompletedEvent: {
          target: 'End',
        }
      }
    },
    End: {
      description: 'Ends workflow',
      type: 'final', // When a machine reaches the final state, it can no longer receive any events, and anything running inside it is canceled and cleaned up
      invoke: {
        src: 'endWorkflow',
      },
    }
  },
});

// Create an actor that you can send events to.
// Note: the actor is not started yet!
const actor = createActor(workflowsMachine);

// Subscribe to snapshots (emitted state changes) from the actor
actor.subscribe((snapshot) => {
  console.log('Value:', snapshot.value);
});

// Start the actor
actor.start();

// Send events to state machine when a RabbitMQ event from Expert is consumed
actor.send({ type: 'ContentImportedEvent', resourceIds });
actor.send({ type: 'TmAppliedEvent' });
actor.send({ type: 'MtAppliedEvent' });
actor.send({ type: 'TaskCompletedEvent' });