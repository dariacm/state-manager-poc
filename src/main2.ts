import {assign, createActor, fromPromise, setup} from 'xstate';

// from db
const resourceIds = [1, 2, 3];

type SchemaObject = {
  state: string
  on?: string // Event that triggers a change in state
  target?: string // Method to be triggered by the event
  actions?: any // Actions to be executed when the machine transitions
  src?: string // Method to be invoked when reaching a state
  srcMetadata?: Record<string,string>
  type?: 'final'
}

// @ts-ignore
const schema: SchemaObject[] = [
  {
    state: 'Idle',
    on: 'ContentImportedEvent',
    target: 'ApplyTranslationMemory',
    actions: assign({
      resourceIds: ({ event }) => event.resourceIds
    })
  },
  {
    state: 'ApplyTranslationMemory',
    src: 'applyTranslationMemoryFunction',
    on: 'TmAppliedEvent',
    target: 'TranslateWithMachineTranslation',
  },
  {
    state: 'TranslateWithMachineTranslation',
    src: 'translateWithMachineTranslation',
    on: 'MtAppliedEvent',
    target: 'End',
    srcMetadata: {
      integration: 'DeepL'
    }
  },
  {
    state: 'End',
    type: 'final',
    src: 'endWorkflow',
  }
]

type WorkflowEvents =
  | { type: 'ContentImportedEvent'; resourceIds: number[] }
  | { type: 'TmAppliedEvent' }
  | { type: 'MtAppliedEvent' }
  | { type: 'TaskCompletedEvent' };

const actors = {
  applyTranslationMemoryFunction: fromPromise(
    async ({ input }: { input: { resourceIds: string[] } }) => {
      console.log(`applyTranslationMemoryFunction started with IDs ${input.resourceIds}`);
      // Logic to call Expert so that it can apply translation memory and send event when it's finished
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`applyTranslationMemoryFunction completed with IDs ${input.resourceIds}`);
    }
  ),
  translateWithMachineTranslation: fromPromise(
    async ({ input }: { input: { integration: string } }) => {
      console.log(`translateWithMachineTranslation started with integration ${input.integration}`);
      // Logic to call Expert so that it can apply machine translation and send event when it's finished
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`translateWithMachineTranslation completed with integration ${input.integration}`);
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
}

const dynamicWorkflowsMachine = setup({actors}).createMachine({
  id: 'workflows',
  initial: 'Idle',
  context: {
    resourceIds
  },
  types: {} as {
    events: WorkflowEvents;
  },
  states: schema.reduce((acc, { state, on, target, actions, src, type, srcMetadata }) => {
    acc[state] = {
      type: type ?? undefined,
      on: on ? {
        [on]: {
          target: target,
          actions: actions ?? undefined,
        }
      } : undefined,
      invoke: src ? {
        src: src,
        // @ts-ignore
        input: ({ context }) => ({
          ...context,
          ...srcMetadata
        }),
      } : undefined,
    }
    return acc;
  }, {} as Record<string, any>)
})
const actor = createActor(dynamicWorkflowsMachine);

actor.subscribe((snapshot) => {
  console.log('Value:', snapshot.value);
});

actor.start();

actor.send({ type: 'ContentImportedEvent', resourceIds: [4, 5] });
actor.send({ type: 'TmAppliedEvent' });
actor.send({ type: 'MtAppliedEvent' });
actor.send({ type: 'TaskCompletedEvent' });