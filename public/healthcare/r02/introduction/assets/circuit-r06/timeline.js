export const duration=58,starts=[0,2,4,5,44],stationStarts={dumbbells:5,bench:18,elliptical:32};
export const clamp=x=>Math.min(1,Math.max(0,x));
export const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const segments=[
 [0,2,'dumbbells','try',0,'Start with Nemotron','It can lift. Now train the technique.'],
 [2,4,'dumbbells','prepare',1,'Prepare training tasks','Different tasks. Different techniques to practice.'],
 [4,5,'dumbbells','environment',2,'Connect NeMo Gym','One place to practice and receive feedback.'],
 [5,8,'dumbbells','try',3,'Dumbbells: first attempt','It lifts the weights. But swings its body.'],
 [8,9,'dumbbells','feedback',3,'Evaluate the attempt','Completion is only part of the picture.'],
 [9,10,'dumbbells','update',3,'NeMo RL updates Nemotron','Feedback becomes a model update.'],
 [10,13,'dumbbells','retry',3,'Dumbbells: practice again','Full movement. A steadier body.'],
 [13,14,'dumbbells','putdown',3,'Move to another task','Now practice a different skill.'],
 [14,16,'bench','walk-bench',3,'Move to the bench press','Same learner. A different task.'],
 [16,18,'bench','mount-bench',3,'Bench press','Get ready for the next attempt.'],
 [18,21,'bench','try',3,'Bench press: first attempt','The press finishes. The bar wobbles.'],
 [21,22,'bench','feedback',3,'Evaluate the press','Reward a controlled, steady press.'],
 [22,23,'bench','update',3,'NeMo RL updates Nemotron','Use that feedback to improve the next attempt.'],
 [23,26,'bench','retry',3,'Bench press: practice again','A smoother press. A level bar.'],
 [26,28,'bench','unmount-bench',3,'Practice across tasks','One exercise does not train every capability.'],
 [28,31,'elliptical','walk-elliptical',3,'Move to the elliptical','The next task calls for coordination.'],
 [31,32,'elliptical','mount-elliptical',3,'Elliptical','Prepare for another kind of movement.'],
 [32,35,'elliptical','try',3,'Elliptical: first attempt','The pedals turn. The rhythm is uneven.'],
 [35,36,'elliptical','feedback',3,'Evaluate the movement','Reward coordination and a steady rhythm.'],
 [36,37,'elliptical','update',3,'NeMo RL updates Nemotron','Practice, feedback, update. Repeat across tasks.'],
 [37,40,'elliptical','retry',3,'Elliptical: practice again','Coordinated movement. A steadier rhythm.'],
 [40,41,'elliptical','unmount-elliptical',3,'Bring the learning back','Return to the first exercise.'],
 [41,43,'dumbbells','walk-home',3,'Return to the weights','Same robot. Better-practiced technique.'],
 [43,44,'dumbbells','pickup',3,'Try the first task again','Put the practiced technique to work.'],
 [44,48,'dumbbells','final',4,'See the change','Full range. A steady body.'],
 [48,52,'dumbbells','final',4,'See the change','Controlled lift. Controlled return.'],
 [52,56,'dumbbells','final',4,'See the change','The technique holds, rep after rep.'],
 [56,58,'dumbbells','hold',4,'See the change','Same model. Better-practiced behavior.']
];
export function script(t){
 const row=segments.find(r=>t>=r[0]&&t<r[1])||segments.at(-1);
 const [start,end,station,action,phase,kicker,title]=row;
 const progress=clamp((t-start)/(end-start));
 const trained=['retry','final','hold','putdown','pickup','walk-home','unmount-bench','unmount-elliptical'].includes(action);
 return{time:t,start,end,station,action,phase,progress,quality:action==='update'?smooth(progress):trained?1:0,kicker:`0${phase+1} / ${kicker}`,title};
}
