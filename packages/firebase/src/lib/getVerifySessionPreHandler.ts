import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type AuthFastifyInstance = FastifyInstance & {
  verifySession: VerifySessionDecorator;
};

type VerifySessionDecorator = (options?: {
  sessionRequired?: boolean;
}) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const getVerifySessionPreHandler = (fastify: FastifyInstance) =>
  (fastify as AuthFastifyInstance).verifySession();

export default getVerifySessionPreHandler;
