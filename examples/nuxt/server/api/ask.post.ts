import { answerQuestion } from '../utils/ask';

export default defineEventHandler((event) => answerQuestion(toWebRequest(event)));
