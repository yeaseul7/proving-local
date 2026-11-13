import { deviceFetch } from './local-remote';
import type { ExamSource,StudyExam,ExamAttempt } from './study-exam';
export async function saveGeneratedExam(identity:{accountKey:string},id:string,exam:StudyExam,sources:ExamSource[]):Promise<ExamAttempt>{
 const response=await deviceFetch('exams',{method:'POST',body:JSON.stringify({account:identity.accountKey,id,exam,sources})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'시험지를 서버에 저장하지 못했습니다.');return data.attempt;
}
