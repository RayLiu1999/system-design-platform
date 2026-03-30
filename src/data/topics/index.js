import { fundamentals } from "./fundamentals";
import { api } from "./api";
import { database } from "./database";
import { cache } from "./cache";
import { mq } from "./mq";
import { distributed } from "./distributed";
import { security } from "./security";
import { observability } from "./observability";

const topicContent = {
  ...fundamentals,
  ...api,
  ...database,
  ...cache,
  ...mq,
  ...distributed,
  ...security,
  ...observability,
};

export default topicContent;
