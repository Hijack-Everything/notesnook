import { groupArray } from "../utils/grouping";
import {
  StorageInterface,
  databaseTest,
  noteTest,
  groupedTest,
  LONG_TEXT,
  TEST_NOTE,
  TEST_NOTEBOOK,
  IMG_CONTENT,
  notebookTest,
} from "./utils";

beforeEach(async () => {
  StorageInterface.clear();
});

test("add invalid note", () =>
  databaseTest().then(async (db) => {
    let id = await db.notes.add();
    expect(id).toBeUndefined();
    id = await db.notes.add({});
    expect(id).toBeUndefined();
    id = await db.notes.add({ hello: "world" });
    expect(id).toBeUndefined();
  }));

test("add note", () =>
  noteTest().then(async ({ db, id }) => {
    let note = db.notes.note(id);
    expect(note.data).toBeDefined();
    expect(await note.content()).toStrictEqual(TEST_NOTE.content.data);
  }));

test("get note content", () =>
  noteTest().then(async ({ db, id }) => {
    let content = await db.notes.note(id).content();
    expect(content).toStrictEqual(TEST_NOTE.content.data);
  }));

test("delete note", () =>
  noteTest().then(async ({ db, id }) => {
    let notebookId = await db.notebooks.add(TEST_NOTEBOOK);
    let topics = db.notebooks.notebook(notebookId).topics;
    let topic = topics.topic("hello");
    await topic.add(id);
    topic = topics.topic("hello");

    expect(topic.all.findIndex((v) => v.id === id)).toBeGreaterThan(-1);
    await db.notes.delete(id);
    expect(db.notes.note(id)).toBeUndefined();
    expect(topic.all.findIndex((v) => v.id === id)).toBe(-1);

    expect(db.notebooks.notebook(notebookId).totalNotes).toBe(0);
    expect(topics.topic("hello").totalNotes).toBe(0);
  }));

test("get all notes", () =>
  noteTest().then(async ({ db }) => {
    expect(db.notes.all.length).toBeGreaterThan(0);
  }));

test("note without a title should get title from content", () =>
  noteTest().then(async ({ db, id }) => {
    let note = db.notes.note(id);
    expect(note.title).toBe("Hello This is colorful");
  }));

test("note should get headline from content", () =>
  noteTest({
    ...TEST_NOTE,
    content: {
      type: TEST_NOTE.content.type,
      data: "<p>This is a very colorful existence.</p>",
    },
  }).then(async ({ db, id }) => {
    let note = db.notes.note(id);
    expect(note.headline).toBe("This is a very colorful existence.");
  }));

test("note should get headline from content containing only lists", () =>
  noteTest({
    ...TEST_NOTE,
    content: {
      type: TEST_NOTE.content.type,
      data: `<ol style="list-style-type: decimal;" data-mce-style="list-style-type: decimal;"><li>Hello I won't be a headline :(</li><li>Me too.</li><li>Gold.</li></ol>`,
    },
  }).then(async ({ db, id }) => {
    let note = db.notes.note(id);
    expect(note.headline).toBe("Hello I won't be a headline :(Me too.Gold.");
  }));

test("note title should allow trailing space", () =>
  noteTest({ title: "Hello ", content: TEST_NOTE.content }).then(
    async ({ db, id }) => {
      let note = db.notes.note(id);
      expect(note.title).toBe("Hello ");
    }
  ));

test("note title should not allow newlines", () =>
  noteTest({ title: "Hello\nhello", content: TEST_NOTE.content }).then(
    async ({ db, id }) => {
      let note = db.notes.note(id);
      expect(note.title).toBe("Hello hello");
    }
  ));

test("update note", () =>
  noteTest().then(async ({ db, id }) => {
    let noteData = {
      id,
      title: "I am a new title",
      content: {
        type: TEST_NOTE.content.type,
        data: "<p><br></p>",
      },
      pinned: true,
      favorite: true,
      // colors: ["red", "blue"]
    };
    id = await db.notes.add(noteData);
    let note = db.notes.note(id);
    expect(note.title).toBe(noteData.title);
    expect(await note.content()).toStrictEqual(noteData.content.data);
    expect(note.data.pinned).toBe(true);
    expect(note.data.favorite).toBe(true);
  }));

test("updating empty note should delete it", () =>
  noteTest().then(async ({ db, id }) => {
    id = await db.notes.add({
      id,
      title: "\n",
      content: {
        type: TEST_NOTE.content.type,
        data: "<p><br></p>",
      },
    });
    expect(id).toBeUndefined();
    let note = db.notes.note(id);
    expect(note).toBeUndefined();
  }));

test("get favorite notes", () =>
  noteTest({
    ...TEST_NOTE,
    favorite: true,
  }).then(({ db }) => {
    expect(db.notes.favorites.length).toBeGreaterThan(0);
  }));

test("get pinned notes", () =>
  noteTest({
    ...TEST_NOTE,
    pinned: true,
  }).then(({ db }) => {
    expect(db.notes.pinned.length).toBeGreaterThan(0);
  }));

test("get grouped notes by abc", () => groupedTest("abc"));

test("get grouped notes by month", () => groupedTest("month"));

test("get grouped notes by year", () => groupedTest("year"));

test("get grouped notes by weak", () => groupedTest("week"));

test("get grouped notes default", () => groupedTest());

test("pin note", () =>
  noteTest().then(async ({ db, id }) => {
    let note = db.notes.note(id);
    await note.pin();
    note = db.notes.note(id);
    expect(note.data.pinned).toBe(true);
  }));

test("favorite note", () =>
  noteTest().then(async ({ db, id }) => {
    let note = db.notes.note(id);
    await note.favorite();
    note = db.notes.note(id);
    expect(note.data.favorite).toBe(true);
  }));

test("add note to topic", () =>
  noteTest().then(async ({ db, id }) => {
    let notebookId = await db.notebooks.add({ title: "Hello" });
    let topics = db.notebooks.notebook(notebookId).topics;
    await topics.add("Home");
    let topic = topics.topic("Home");
    await topic.add(id);
    topic = topics.topic("Home");
    expect(topic.all.length).toBe(1);
    expect(topic.totalNotes).toBe(1);
    expect(db.notebooks.notebook(notebookId).totalNotes).toBe(1);
    let note = db.notes.note(id);
    expect(note.notebooks.some((n) => n.id === notebookId)).toBe(true);
  }));

test("duplicate note to topic should not be added", () =>
  noteTest().then(async ({ db, id }) => {
    let notebookId = await db.notebooks.add({ title: "Hello" });
    let topics = db.notebooks.notebook(notebookId).topics;
    await topics.add("Home");
    let topic = topics.topic("Home");
    await topic.add(id);
    topic = topics.topic("Home");
    expect(topic.all.length).toBe(1);
  }));

test("add the same note to 2 notebooks", () =>
  noteTest().then(async ({ db, id }) => {
    let notebookId = await db.notebooks.add({ title: "Hello" });
    let topics = db.notebooks.notebook(notebookId).topics;
    await topics.add("Home");
    let topic = topics.topic("Home")._topic;
    await db.notes.move({ id: notebookId, topic: topic.id }, id);

    expect(topics.topic(topic.id).has(id)).toBe(true);

    let notebookId2 = await db.notebooks.add({ title: "Hello2" });
    let topics2 = db.notebooks.notebook(notebookId2).topics;
    await topics2.add("Home2");
    let topic2 = topics2.topic("Home2")._topic;
    await db.notes.move({ id: notebookId2, topic: topic2.id }, id);

    let note = db.notes.note(id);
    expect(note.notebooks.length).toBe(2);
    expect(topics2.topic(topic2.id).has(id)).toBe(true);
  }));

test("moving note to same notebook and topic should do nothing", () =>
  noteTest().then(async ({ db, id }) => {
    const notebookId = await db.notebooks.add({ title: "Hello" });
    let topics = db.notebooks.notebook(notebookId).topics;
    await topics.add("Home");
    let topic = topics.topic("Home");
    await topic.add(id);
    await db.notes.move({ id: notebookId, topic: "Home" }, id);
    let note = db.notes.note(id);
    expect(note.notebooks.some((n) => n.id === notebookId)).toBe(true);
  }));

test("export note to html", () =>
  noteTest().then(async ({ db, id }) => {
    const html = await db.notes.note(id).export("html");
    expect(html.includes(TEST_NOTE.content.data)).toBeTruthy();
  }));

test("export note to md", () =>
  noteTest().then(async ({ db, id }) => {
    const md = await db.notes.note(id).export("md");
    expect(md.includes(`Hello  \nThis is colorful\n`)).toBeTruthy();
  }));

test("export note to txt", () =>
  noteTest().then(async ({ db, id }) => {
    const txt = await db.notes.note(id).export("txt");
    expect(txt.includes("Hello")).toBeTruthy();
  }));

test("deleting a colored note should remove it from that color", () =>
  noteTest().then(async ({ db, id }) => {
    await db.notes.note(id).color("Yellow");
    let color = db.colors.tag("Yellow");

    expect(color).toBeTruthy();
    expect(color.noteIds.indexOf(id)).toBeGreaterThan(-1);

    await db.notes.delete(id);

    color = db.colors.tag("Yellow");
    expect(color).toBeFalsy();
    // TODO expect(color.noteIds.indexOf(id)).toBe(-1);
  }));

test("grouping items where item.title is empty or undefined shouldn't throw", () => {
  expect(
    groupArray([{ title: "" }], {
      groupBy: "abc",
      sortBy: "title",
      sortDirection: "asc",
    })
  ).toBeTruthy();
});

test("note content should not contain image base64 data after save", () =>
  noteTest().then(async ({ db, id }) => {
    StorageInterface.write(`_uk_@email@email.com`, {
      key: { password: "password" },
    });

    await db.user.setUser({
      email: "email@email.com",
      attachmentsKey: {
        cipher: "{}",
        iv: "iv",
        salt: "salt",
        length: 100,
        key: { password: "password" },
      },
    });

    await db.attachments.add(
      {
        iv: "iv",
        length: 100,
        alg: "xha-stream",
        hash: "d3eab72e94e3cd35",
        hashType: "xxh64",
        type: "image/jpeg",
        chunkSize: 512,
        filename: "hello",
        key: {},
        salt: "hellowrold",
      },
      id
    );

    await db.notes.add({ id, content: { type: "tiny", data: IMG_CONTENT } });
    const note = db.notes.note(id);
    const content = await note.content();
    expect(content).not.toContain(`src="data:image/png;`);
    expect(content).not.toContain(`src=`);
  }));

test("repairing notebook references should reinclude the missing noteIds", () =>
  notebookTest().then(async ({ db, id }) => {
    const notebook = db.notebooks.notebook(id);
    let note = {
      ...TEST_NOTE,
      notebooks: [{ id, topics: [notebook.topics.all[0].id] }],
    };
    const noteId = await db.notes.add(note);
    await db.notes.repairReferences();
    note = db.notes.note(noteId);
    expect(notebook.topics.all[0].notes.length).toBe(0);
    expect(note.notebooks.length).toBe(0);
  }));
