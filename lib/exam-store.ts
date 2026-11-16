import { deviceFetch } from './local-remote';
import type { ExamSource,StudyExam,ExamAttempt } from './study-exam';
export async function saveGeneratedExam(identity:{accountKey:string},id:string,exam:StudyExam,sources:ExamSource[]):Promise<ExamAttempt>{
 const response=await deviceFetch('exams',{method:'POST',body:JSON.stringify({account:identity.accountKey,id,exam,sources})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'시험지를 서버에 저장하지 못했습니다.');return data.attempt;
}

export async function readOwnExam(_identity:{accountKey:string},id:string):Promise<ExamAttempt|null>{
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))return null;
 const response=await deviceFetch(`exams/${id}`);if(response.status===404)return null;
 const data=await response.json();if(!response.ok)throw new Error(data.error||'시험지를 읽지 못했습니다.');return data.attempt;
}
export async function saveOwnExamFeedback(identity:{accountKey:string},id:string,memos:string[],feedback:import('./exam-feedback').MemoFeedback[]):Promise<ExamAttempt>{
 const response=await deviceFetch(`exams/${id}`,{method:'PATCH',body:JSON.stringify({account:identity.accountKey,feedbackMemos:memos,feedback})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'추가 해설을 저장하지 못했습니다.');return data.attempt;
}
