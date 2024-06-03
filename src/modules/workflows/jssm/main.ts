const jssm = require('jssm'); // https://github.com/StoneCypher/jssm/pull/569

const TrafficLight = jssm.sm`
  Off 'start' -> Red 'next' => Green 'next' => Yellow 'next' => Red;
  [Red Yellow Green] 'shut down' ~> Off;
`;

const LogState = () => console.log( TrafficLight.state() );

LogState();                         // logs "Off"

TrafficLight.action('start');       // returns true
LogState();                         // logs "Red"

TrafficLight.action('next');        // returns true
LogState();                         // logs "Green"

TrafficLight.transition('Yellow');  // returns true
LogState();                         // logs "Yellow"

TrafficLight.transition('Blue');    // returns false, as there's no such state
LogState();                         // logs "Yellow"

TrafficLight.transition('Green');   // returns false, as yellow can only go to red
LogState();                         // logs "Yellow"

// --------------

const resourceIds = [1, 2, 3]

// @ts-ignore
async function applyTranslationMemory(input) {
  console.log(`Applying translation memory on IDs ${input['resourceIds']}`)
  return await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

// @ts-ignore
async function translateWithMachineTranslation(input) {
  console.log(`Translating with machine translation IDs ${input['resourceIds']} using engine ${input['integration']}`)
  return await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

async function endWorkflow() {
  console.log(`Ending workflow`)
  return await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

const workflow = [
  {
    state: 'TranslationMemory',
    handler: 'applyTranslationMemory',
    handlerContext: {
      resourceIds: resourceIds
    }
  },
  {
    state: 'MachineTranslation',
    handler: 'translateWithMachineTranslation',
    handlerContext: {
      resourceIds: resourceIds,
      integration: 'DeepL'
    }
  },
  {
    state: 'End',
    handler: 'endWorkflow'
  },
]

/* static
const WorkflowsMachine = jssm.sm`
  Idle 'start' -> TranslationMemory 'next' => MachineTranslation 'next' => End;
  [End] 'stop' ~> Idle;
`;
 */

// dynamic
const states = workflow.map((step) => step.state).join(' \'next\' => ');
const transitions = states + ' \'next\' => End;';
const machineDeclaration = `Idle 'start' -> ${transitions} [End] 'stop' ~> Idle;`;

const startTime = performance.now()
const WorkflowsMachine = jssm.sm`${machineDeclaration}`

//WorkflowsMachine.hook_any_transition( () => console.log( WorkflowsMachine.state() ) );

/* static
WorkflowsMachine.hook_entry('TranslationMemory', () => applyTranslationMemory(resourceIds))
WorkflowsMachine.hook_entry('MachineTranslation', () => translateWithMachineTranslation(resourceIds, 'DeepL'))
WorkflowsMachine.hook_entry('End', () => endWorkflow())
 */

// dynamic
workflow.forEach((step) => {
  if (step.handler) {
    WorkflowsMachine.hook_entry(step.state, () => {
      const handlerFunction = eval(step.handler);
      handlerFunction(step.handlerContext ?? undefined);
    });
  }
});
const endTime = performance.now()
console.log(`Machine creation took ${endTime - startTime} milliseconds`)

WorkflowsMachine.action('start')
WorkflowsMachine.action('next')
WorkflowsMachine.action('next')