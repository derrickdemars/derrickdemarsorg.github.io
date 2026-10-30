import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import geometryPacing2627 from "./data/geometry-pacing-2026-2027.json";
// Math Hub: true when running at derrickdemars.org/planner (set by hub-bridge.js). AI that needs the Claude app on your computer is hidden there.
const HUB_ONLINE = typeof window !== "undefined" && !!window.HUB_PLANNER_ONLINE;
const COURSES = ["7th Grade Math","8th Grade Math","Algebra I","Algebra II","Geometry","Algebra III"];
// Display order for the Daily View — its tab, its search index and its print all read
// this one list, so they cannot drift out of sync.
const DAILY_ORDER = ["Geometry","Algebra I","Algebra III","7th Grade Math","8th Grade Math","Algebra II"];
// Rows shown in the Daily View, in order. The tab and its PDF both read this list so the
// printout cannot drift from what is on screen. `composite` rows combine a dropdown
// selection with its text; every row is hidden when it has no content, in both places.
const DAILY_VIEW_ROWS = [
  {key:"lessonTitle",label:"Lesson Topic"},
  {key:"centralFocus",label:"Central Focus"},
  {key:"essentialQs",label:"Essential Questions"},
  {key:"bellWork",label:"Bell Work",composite:true},
  {key:"anticipatorySet",label:"Anticipatory Set",composite:true},
  {key:"lesson",label:"Lesson",composite:true},
  {key:"guidedPractice",label:"Guided Practice",composite:true},
  {key:"independentPractice",label:"Independent Practice",composite:true},
  {key:"conclusion",label:"Exit Ticket & Conclusion",composite:true},
  {key:"assessment",label:"Assessment",composite:true},
];
// Row subset for the per-class "Individual PDF" export: the instructional flow of the
// lesson plus accommodations, without Central Focus, Essential Questions or Assessment.
// Accommodations is not a Daily View row, so getVal below has a case for it.
const DAILY_INDIVIDUAL_ROWS = [
  {key:"lessonTitle",label:"Lesson Topic"},
  {key:"bellWork",label:"Bell Work",composite:true},
  {key:"anticipatorySet",label:"Anticipatory Set",composite:true},
  {key:"lesson",label:"Lesson",composite:true},
  {key:"guidedPractice",label:"Guided Practice",composite:true},
  {key:"independentPractice",label:"Independent Practice",composite:true},
  {key:"conclusion",label:"Exit Ticket & Conclusion",composite:true},
  {key:"accommodations",label:"Accommodations",composite:true},
];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DAY_HDR_BG_LIGHT = {Monday:"#87ceeb",Tuesday:"#ffa07a",Wednesday:"#bce861",Thursday:"#fe86ab",Friday:"#fff231"};
const DAY_COL_BG_LIGHT = {Monday:"#eaf6fd",Tuesday:"#fff1eb",Wednesday:"#f4fde3",Thursday:"#ffedf3",Friday:"#ffffe8"};
const DAY_BORDER_LIGHT = {Monday:"#5aaedc",Tuesday:"#e07050",Wednesday:"#8ec430",Thursday:"#e05080",Friday:"#c8c000"};
const DAY_HDR_BG_DARK = {Monday:"#1a3a5c",Tuesday:"#5a2a10",Wednesday:"#2a4a00",Thursday:"#5a1040",Friday:"#4a4000"};
const DAY_COL_BG_DARK = {Monday:"#1a2a3c",Tuesday:"#2a1a14",Wednesday:"#1a2a12",Thursday:"#2a1420",Friday:"#2a2a10"};
const DAY_BORDER_DARK = {Monday:"#3a6a9c",Tuesday:"#a04828",Wednesday:"#5a8418",Thursday:"#a03060",Friday:"#888000"};
let DAY_HDR_BG = {...DAY_HDR_BG_LIGHT};
let DAY_COL_BG = {...DAY_COL_BG_LIGHT};
let DAY_BORDER = {...DAY_BORDER_LIGHT};
const T_LIGHT = {
  bg:"#f0f2f5",surface:"#ffffff",surface2:"#e8eaed",border:"#c8cdd6",
  headerBg:"#2d4a6e",text:"#1e2a3a",textMuted:"#5a6a80",
  accent:"#0d9488",accentBlue:"#1d4ed8",
  error:"#dc2626",errorBg:"#fee2e2",amber:"#b45309",
};
const T_DARK = {
  bg:"#121212",surface:"#1e1e1e",surface2:"#2d2d2d",border:"#444444",
  headerBg:"#1e1e1e",text:"#e0e0e0",textMuted:"#999999",
  accent:"#14b8a6",accentBlue:"#60a5fa",
  error:"#f87171",errorBg:"#3b1111",amber:"#fbbf24",
};
let T = {...T_LIGHT};
const TERM_WEEKS = ["Week 1","Week 2","Week 3","Week 4","Week 5","Week 6","Week 7","Week 8","Week 9","Week 10","Week 11","Week 12","Week 13"];
const TERMS = ["Term I","Term II","Term III","Term IV","Break"];
let COURSE_COLORS = {
  "7th Grade Math":      {bg:"#16a34a", light:"#f0fdf4", border:"#86efac", text:"#14532d"},
  "8th Grade Math":      {bg:"#2563eb", light:"#eff6ff", border:"#93c5fd", text:"#1e3a8a"},
  "Algebra I":           {bg:"#ea580c", light:"#fff7ed", border:"#fdba74", text:"#7c2d12"},
  "Algebra II":          {bg:"#dc2626", light:"#fef2f2", border:"#fca5a5", text:"#7f1d1d"},
  "Geometry":            {bg:"#9333ea", light:"#faf5ff", border:"#c4b5fd", text:"#4c1d95"},
  "Algebra III":        {bg:"#ca8a04", light:"#fefce8", border:"#fde047", text:"#713f12"},
  // Legacy aliases (2025-2026 and earlier) — kept so historical plans still render with correct colors
  "6th Grade Math":      {bg:"#16a34a", light:"#f0fdf4", border:"#86efac", text:"#14532d"},
  "7th/8th Grade Math":  {bg:"#2563eb", light:"#eff6ff", border:"#93c5fd", text:"#1e3a8a"},
  "Essentials":          {bg:"#ca8a04", light:"#fefce8", border:"#fde047", text:"#713f12"},
};
let _defaultTerm="Term I";
let _settings={apiKey:"",aiProvider:"gemini",aiModel:"gemini-flash",teacherName:"Dr. Derrick DeMars",schoolName:"Innova Preparatory School",location:"Hattiesburg, MS"};
function getDefaultTerm(){ return _defaultTerm; }
const BELL_WORK_OPTIONS = ["Warm-Up (Previous Lesson)","Warm-Up (Today's Lesson)","IXL Skills","ACT Prep","Paper Quiz Day","IXL Quiz Day","Test Day","Term Exam","Spiral Review","Error Analysis","Vocabulary & Notation Check","Estimate & Justify","Quiz/Test Corrections","Notice & Wonder","Choice Board","Calculator & Desmos Fluency","Other"];
const BELL_WORK_TEXT = {"Warm-Up (Previous Lesson)":"Students will enter the classroom, locate the Warm-Up on their desks or on the SMART TV, and begin working immediately. The Warm-Up presents one to two problems on [Insert topic from the previous lesson that aligns with the lesson topic, central focus, and learning objectives]. The teacher circulates for three to five minutes, then reviews answers aloud before instruction begins. [Insert at least 25 words]","Warm-Up (Today's Lesson)":"Students will begin the Warm-Up immediately upon entering, working from the copy on their desks or the problem displayed on the SMART TV. The one to two problems preview [Insert prerequisite skill or entry point for today's content that aligns with the lesson topic, central focus, and learning objectives]. The teacher circulates for three to five minutes and uses student responses to launch instruction. [Insert at least 25 words]","IXL Skills":"Students will retrieve their Chromebooks, log in, and resume their assigned IXL skill on [Insert skill or standard that aligns with the lesson topic, central focus, and learning objectives] for the first three to five minutes of class. Students who have already reached the target SmartScore will advance to the next assigned skill or a designated spiral skill. [Insert at least 25 words]","ACT Prep":"Students will complete a short set of ACT-style problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] during the first three to five minutes. Students work independently first; the teacher then reviews the most efficient strategy and one common trap, keeping the debrief brief enough to protect instructional time. [Insert at least 25 words]","Paper Quiz Day":"Students will retrieve their binders and study guides, clear their desks of all distracting materials, and silently review [Insert two or three concepts most heavily weighted on the quiz] while the teacher distributes the quiz, laminates, calculators, and any approved accommodations. Silent review continues for three to five minutes until every student has a copy. [Insert at least 25 words]","IXL Quiz Day":"Students will retrieve and log into their Chromebooks, open IXL, and navigate to the assigned quiz without beginning it. While the teacher confirms logins and accommodations, students will spend three to five minutes reviewing [Insert two or three concepts assessed on the quiz] in their notes before the class begins together. [Insert at least 25 words]","Test Day":"Students will collect their study guide, laminate, calculator, and any other approved accommodations, then clear their desks. During the first three to five minutes, students will rate their confidence on each section of the study guide and reread the section they rated lowest while the teacher completes distribution. [Insert at least 25 words]","Term Exam":"Students will collect the cumulative study guide, laminate, calculator, and any approved accommodations for the term exam, then clear their desks. During the first three to five minutes, students will identify the two most difficult units from [Insert units covered this term] and review those sections while the teacher distributes materials and confirms exam timing. [Insert at least 25 words]","Spiral Review":"Students will complete two to three problems drawn from previously mastered content, including [Insert earlier units or standards being spiraled], within the first three to five minutes. The problems are intentionally unrelated to today's lesson so students practice retrieving skills without a contextual cue. The teacher reviews answers briefly and notes any skill needing reteaching. [Insert at least 25 words]","Error Analysis":"Students will examine a worked solution on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] that contains one deliberate error. Within three to five minutes, students will locate the error, explain why it is incorrect, and write the corrected solution. The teacher calls on two students to defend their reasoning. [Insert at least 25 words]","Vocabulary & Notation Check":"Students will complete a four-box organizer for [Insert key term or notation from the lesson] containing a definition in their own words, an example, a non-example, and a visual or symbolic representation. The three to five minute task builds precise mathematical language before the term appears in instruction. [Insert at least 25 words]","Estimate & Justify":"Students will estimate the answer to a problem involving [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and write one sentence justifying that estimate before any computation is permitted. During the three to five minute window, the teacher collects a range of estimates for students to compare against the exact result later in the lesson. [Insert at least 25 words]","Quiz/Test Corrections":"Students will receive their graded [Insert quiz or test name] and rework two missed problems on a corrections sheet. For each, students will identify whether the error was conceptual, procedural, or careless. The three to five minute window is used for corrections only; the teacher records completion and follows up with students showing conceptual errors. [Insert at least 25 words]","Notice & Wonder":"Students will examine a displayed graph, table, diagram, or pattern connected to [Insert new concept being introduced today] and record what they notice and what they wonder. No prior instruction is required. Within three to five minutes, the teacher collects responses and uses student wonderings to launch the lesson. [Insert at least 25 words]","Choice Board":"Students will select and complete one of three problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], offered at increasing levels of challenge. Students choosing the most advanced problem may attempt a brief extension. The three to five minute structure allows every student to begin at an appropriate entry point. [Insert at least 25 words]","Calculator & Desmos Fluency":"Students will complete a short technology task on [Insert calculator or Desmos skill needed for upcoming instruction, the ACT, or the AP Precalculus exam], such as adjusting a window, building a table, or running a regression. The three to five minute drill builds tool fluency so technology does not become an obstacle during assessment. [Insert at least 25 words]","Other":"[Insert Bell Work description that aligns with the lesson topic, central focus, and learning objectives. Specify what students do upon entry, the three to five minute time frame, and how the activity is closed out.]"};
const STATIC_BELL_WORK = ["Paper Quiz Day","IXL Quiz Day","Test Day","Term Exam"];
const BELL_WORK_PROMPTS = {
  "Warm Up (Previous Lesson)":(c,t,pt)=>`In 65 words or fewer, describe what students do and what the teacher does during bell work for a ${c} class. Students enter, find a Warm-Up on their desks, and immediately begin 1-2 problems related to the previous lesson${pt?` on "${pt}"`:""}. The teacher circulates, addresses questions, and keeps students focused. Write as a polished classroom description, not as instructions to the teacher.`,
  "Warm Up (Today's Lesson)":(c,t)=>`In 65 words or fewer, describe what students do and what the teacher does during bell work for a ${c} class on "${t}". Students enter, find a Warm-Up on their desks, and immediately begin 1-2 problems previewing today's lesson. The teacher circulates, addresses questions, and keeps students focused. Write as a polished classroom description, not as instructions to the teacher.`,
  'Math Talk: "Which One Doesn\'t Belong?"':(c,t)=>`In 65 words or fewer, describe what students do and what the teacher does during a Which One Doesn\'t Belong Math Talk for a ${c} class on "${t}". Describe the activity format and teacher role. Write as a polished classroom description, not as instructions to the teacher.`,
  "Recap Last Assessment":(c,t)=>`In 65 words or fewer, describe what students do and what the teacher does during a Recap Last Assessment bell work for a ${c} class. Students review recent quiz results; the teacher highlights key takeaways and addresses areas needing reinforcement. Write as a polished classroom description, not as instructions to the teacher.`,
  "IXL Skills":(c,t)=>`In 65 words or fewer, describe what students do and what the teacher does during IXL Skills bell work for a ${c} class on "${t}". Students take out Chromebooks and continue working on assigned IXL skills. The teacher monitors progress and redirects as needed. Write as a polished classroom description, not as instructions to the teacher.`,
  "ACT Prep":(c,t)=>`In 65 words or fewer, describe what students do and what the teacher does during ACT Prep bell work for a ${c} class on "${t}". Students take out Chromebooks and work on IXL skills aligned to ACT readiness and this week's topics. The teacher monitors and supports. Write as a polished classroom description, not as instructions to the teacher.`,
  "Paper Quiz Day":()=>`Everyone gets binders first; teacher confirms calculators/Chromebooks are ready; students take out the study guide and place binders under desks once the assessment begins; after the summative, students complete the exit ticket and begin IXL Diagnostic Arena work.`,
  "IXL Quiz Day":()=>`Everyone gets binders first; teacher confirms calculators/Chromebooks are ready; students take out the study guide and place binders under desks once the assessment begins; after the summative, students complete the exit ticket and begin IXL Diagnostic Arena work.`,
  "Test Day":()=>`Everyone gets binders first; teacher confirms calculators/Chromebooks are ready; students take out the study guide and place binders under desks once the assessment begins; after the summative, students complete the exit ticket and begin IXL Diagnostic Arena work.`,
  "Term Exam":()=>`Everyone gets binders first; teacher confirms calculators/Chromebooks are ready; students take out the study guide and place binders under desks once the assessment begins; after the summative, students complete the exit ticket and begin IXL Diagnostic Arena work.`,
  "Other":(c,t,desc)=>desc
    ?`In 65 words or fewer, describe what students do and what the teacher does during bell work described as: "${desc}", for a ${c} class on "${t}". Write as a polished classroom description, not as instructions to the teacher.`
    :`In 65 words or fewer, describe what students do and what the teacher does during bell work for a ${c} class on "${t}". Write as a polished classroom description, not as instructions to the teacher.`,
};
const ANTICIPATORY_SET_OPTIONS = ["Thought-Provoking Question","Error Analysis","Short Story or Anecdote","Demonstration or Visual","Review Study Guide","Summative Assessment","Scavenger Hunt","Math Talk: Which One Doesn't Belong?","Real-World Application Hook","Prediction Challenge","Concept Attainment","Agree or Disagree","Number Talk","Unpacking the Learning Target","Historical Origin Story","Kinesthetic Demonstration","Live Class Data","Quick Review Game","Other"];
const ANTICIPATORY_SET_TEXT = {"Thought-Provoking Question":"The teacher will pose a probing question connected to [Insert topic that aligns with the lesson topic, central focus, and learning objectives] before any instruction is given. Students will take a position and defend it for three to five minutes. The teacher will withhold the answer, allowing the unresolved question to motivate the lesson. [Insert at least 35 words]","Error Analysis":"The teacher will display erroneous work related to [Insert topic that aligns with the lesson topic, central focus, and learning objectives of today or the previous day] and ask students to diagnose it. Over three to five minutes, students will identify the error, explain the underlying misconception, and propose a correction. [Insert at least 35 words]","Short Story or Anecdote":"The teacher will share a brief narrative, real-world scenario, or word problem connected to [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. The three to five minute story will end at a point of tension or an unanswered question, giving students a reason to want the mathematics that follows. [Insert at least 35 words]","Demonstration or Visual":"The teacher will present a striking visual, physical object, short video, or live demonstration related to [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. Within three to five minutes, students will describe what they observed and generate at least one mathematical question the demonstration raises. [Insert at least 35 words]","Review Study Guide":"The teacher will ask, \"Which concept from the past two weeks still feels tricky?\" and address the most requested item for three to five minutes. The review will connect major ideas, terms, and processes introduced since the last assessment, reinforcing retention and helping students perceive relationships between individual lessons. [Insert at least 35 words]","Summative Assessment":"The teacher will introduce [Insert summative assessment name], stating the units assessed, the format, the time allotted, and the materials permitted. Within three to five minutes, the teacher will review testing expectations and accommodations, answer procedural questions, and confirm that every student is able to begin without interruption. [Insert at least 35 words]","Scavenger Hunt":"The teacher will introduce a scavenger hunt on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], explaining its collaborative structure and purpose as a review. Within three to five minutes, the teacher will state the rules, emphasize teamwork and accuracy, and model one sample problem showing how students move between stations. [Insert at least 35 words]","Math Talk: Which One Doesn't Belong?":"The teacher will display four related items — numbers, graphs, shapes, or expressions tied to [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. For three to five minutes, students will debate which item does not belong. Because each choice is defensible, the task rewards close observation, justification, and diverse thinking. [Insert at least 35 words]","Real-World Application Hook":"The teacher will present an authentic context in which [Insert topic that aligns with the lesson topic, central focus, and learning objectives] is actually used, such as a career task, financial decision, or engineering constraint. Within three to five minutes, students will identify what information would be needed to solve it. [Insert at least 35 words]","Prediction Challenge":"The teacher will set up a demonstration, pattern, or graph related to [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and pause before the outcome. Students will commit to a prediction in writing within three to five minutes; the reveal is saved for later in the lesson. [Insert at least 35 words]","Concept Attainment":"The teacher will display a set of examples and non-examples of [Insert concept or definition being introduced today] without naming the concept. Over three to five minutes, students will articulate the rule that separates the two groups. The teacher will then supply formal vocabulary for the definition students constructed themselves. [Insert at least 35 words]","Agree or Disagree":"The teacher will post a debatable mathematical claim about [Insert topic that aligns with the lesson topic, central focus, and learning objectives], often a common misconception stated as fact. Within three to five minutes, students will take a position and defend it. The claim is resolved during instruction rather than immediately. [Insert at least 35 words]","Number Talk":"The teacher will display one expression or computation related to [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and ask students to evaluate it mentally, without pencils. Over three to five minutes, several students will share differing strategies while the teacher records each method publicly. [Insert at least 35 words]","Unpacking the Learning Target":"The teacher will display today's objective and standard, [Insert MSCCRS or AP Precalculus standard], and unpack it in student-friendly language. Within three to five minutes, the teacher will name the prior skill this concept builds on and the future course where it reappears, establishing purpose before instruction. [Insert at least 35 words]","Historical Origin Story":"The teacher will give a brief account of why [Insert concept being introduced today] was developed and the problem it was invented to solve. The three to five minute account frames the concept as a human solution rather than an arbitrary procedure, ending with the question the mathematics answered. [Insert at least 35 words]","Kinesthetic Demonstration":"The teacher will direct students to model [Insert topic that aligns with the lesson topic, central focus, and learning objectives] physically, using movement, manipulatives, or student positioning such as a human number line, coordinate plane, or unit circle. The three to five minute activity gives students a physical referent for later abstraction. [Insert at least 35 words]","Live Class Data":"The teacher will collect a quick set of data from the class on [Insert measurable question connected to today's lesson] and record the results on the board. Within three to five minutes, the class will have generated the dataset used during instruction, ensuring students are invested in the numbers being analyzed. [Insert at least 35 words]","Quick Review Game":"The teacher will launch a brief digital review round on [Insert topic or unit being reviewed] using Kahoot, Blooket, Quizizz, or a similar platform. The three to five minute round is capped at a set number of questions, and the teacher will note which items produced the most incorrect responses for reteaching. [Insert at least 35 words]","Other":"[Insert anticipatory set description that aligns with the lesson topic, central focus, and learning objectives. Specify the teacher's opening move, the three to five minute time frame, and how the activity connects to the instruction that follows.] [Insert at least 35 words]"};
const STATIC_ANTICIPATORY = ["Group Jam","Summative Assessment","Review Study Guide",'Math Talk: "Which One Doesn\'t Belong?"'];
const ANTICIPATORY_SET_PROMPTS = {
  "Thought-Provoking Question":(c,t)=>`In 65 words or fewer, describe (do not write) the anticipatory set for a ${c} lesson on "${t}" using a Thought-Provoking Question. Explain that the teacher prompts critical thinking before introducing the concept, then briefly describe 1-3 thought-provoking questions that will be posed - without fully writing them out. Do NOT begin with a title or heading.`,
  "Present an Erroneous Solution (Error Analysis)":(c,t)=>`In 65 words or fewer, describe (do not write) the anticipatory set for a ${c} lesson on "${t}" using Error Analysis. Explain that the teacher presents erroneous work related to the lesson and asks students to identify the problem. Briefly describe the type of error that will be used. Do NOT begin with a title or heading.`,
  "Short Story or Anecdote":(c,t)=>`In 65 words or fewer, describe (do not write) the anticipatory set for a ${c} lesson on "${t}" using a Short Story or Anecdote. Explain that the teacher shares a brief, engaging narrative relevant to the lesson and briefly describe what the story or anecdote will be about. Do NOT begin with a title or heading.`,
  "Demonstration or Visual":(c,t)=>`In 65 words or fewer, describe (do not write) the anticipatory set for a ${c} lesson on "${t}" using a Demonstration or Visual. Explain that the teacher presents a striking visual, object, or video to spark discussion, and briefly describe what the specific visual or demo will involve. Do NOT begin with a title or heading.`,
  "Group Jam":()=>`Students get Chromebooks and log into IXL for Group Jam. The teacher asks: "What's one concept that still feels tricky? Let's tackle it together!" Quick demonstrations or thought-provoking questions connect students to the material and energize the room.`,
  "Review Study Guide":()=>`The teacher asks students to identify one concept from the study guide that still feels uncertain. Together, the class revisits key ideas, terms, and processes, building confidence before the upcoming assessment.`,
  'Math Talk: "Which One Doesn\'t Belong?"':()=>`The teacher displays four images - numbers, shapes, or patterns - on the screen. Students discuss which doesn't belong. There is no single correct answer, fostering observation, creativity, collaboration, and debate while celebrating diverse mathematical thinking.`,
  "Summative Assessment":(c,t,n)=>`${n||t||"Summative Assessment"}`,
  "Scavenger Hunt":(c,t)=>`The teacher introduces the scavenger hunt as an interactive way to review prior material. Rules, teamwork expectations, and accuracy are emphasized. A sample problem is demonstrated to show how students move between stations based on their answers.`,
  "Other":(c,t)=>`In 65 words or fewer, describe a creative and engaging anticipatory set for a ${c} lesson on "${t}". Do NOT begin with a title or heading. Dive directly into what the teacher and students do to spark curiosity and connect to the lesson.`,
};
const GUIDED_PRACTICE_OPTIONS = ["Worksheet (Guided Notes)","Group Jam","Review: Study Guide","Pre-Quiz","Quiz","Test/Exam","Individual Whiteboards","Scavenger Hunt","Think-Pair-Share","Partner Coaching","Numbered Heads Together","Gallery Walk","Tiered Practice","IXL Independent Practice","Chunked Practice with Checkpoints","Peer Error Check","Desmos Teacher-Paced Activity","Other"];
const GUIDED_PRACTICE_TEXT = {"Worksheet (Guided Notes)":"The teacher will reinforce techniques collaboratively, with worksheet problems serving as guided notes. Over eight to ten minutes, students will guide the teacher through problems on the SMART TV — volunteering or called on to supply each next step while the teacher records it in color-coded marker and asks why the step works. The class will complete the examples together, emphasizing the breakdown of complex steps on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. [Insert at least 35 words]","Group Jam":"The teacher will run an IXL Group Jam on [Insert IXL skill that aligns with the lesson topic, central focus, and learning objectives], with students responding on their Chromebooks. Over eight to ten minutes, students will work problems collaboratively and independently while the teacher displays selected questions and student solutions for discussion, using the live response data to decide which items need whole-class attention. [Insert at least 35 words]","Review: Study Guide":"Students will attempt each study guide problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] before the class discusses it, rather than watching the teacher solve it first. Over eight to ten minutes, the teacher will circulate, then invite two students with different approaches to compare methods, pausing frequently to explain key steps and draw out student reasoning. [Insert at least 35 words]","Pre-Quiz":"Students will work the Pre-Quiz, which mirrors the upcoming quiz in question count, format, and difficulty with only the numerical values changed. Over eight to ten minutes, the teacher will circulate and answer questions with hints rather than solutions. The Pre-Quiz builds familiarity and confidence while ensuring students study the underlying skills instead of memorizing specific answers. [Insert at least 35 words]","Quiz":"Students will complete [Insert assessment name] independently. The teacher will circulate to monitor progress, confirm that approved accommodations are in place, and maintain a quiet, focused environment. Students who finish early will [Insert early-finisher expectation, such as an assigned IXL skill or test corrections]. The teacher will note items generating repeated questions for reteaching before the next assessment. [Insert at least 35 words]","Test/Exam":"Students will complete [Insert assessment name] under testing conditions. The teacher will maintain a quiet, productive testing atmosphere, circulate to monitor pacing, and ensure approved materials and accommodations remain available throughout. Students who finish early will [Insert early-finisher expectation]. The teacher will record observations about common sticking points to inform the next unit. [Insert at least 35 words]","Individual Whiteboards":"The teacher will pose a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and students will work it independently on individual whiteboards, displaying their boards on a signal. Because every response is visible at once, the teacher can identify misconceptions immediately and adjust the next problem. Over eight to ten minutes, difficulty increases while support fades toward partner discussion. [Insert at least 35 words]","Scavenger Hunt":"Students will rotate through stations in small, ability-balanced groups, using each answer to determine their next station while solving problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. Over eight to ten minutes, the teacher will staff the help station and monitor group progress, redirecting any group whose incorrect answer has sent them off the intended path. [Insert at least 35 words]","Think-Pair-Share":"The teacher will pose a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. Students will work silently for one to two minutes, compare reasoning with a partner, then share with the class. Over eight to ten minutes, the structure guarantees every student attempts the problem before hearing an answer, and the teacher will select which pairs share in order to surface specific strategies. [Insert at least 35 words]","Partner Coaching":"Students will work in pairs on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], with one partner solving aloud while the other coaches, verifies each step, and offers correction or confirmation. Partners will switch roles on the next problem. Over eight to ten minutes, the teacher will circulate and listen for coaching quality, since explaining a step aloud exposes misconceptions that written work hides. [Insert at least 35 words]","Numbered Heads Together":"The teacher will assign each group member a number, pose a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], and require the group to reach consensus and ensure every member can explain the solution. The teacher will then call one number at random to report. Over eight to ten minutes, individual accountability becomes the condition for group success. [Insert at least 35 words]","Gallery Walk":"Groups will solve an assigned problem from [Insert topic that aligns with the lesson topic, central focus, and learning objectives] on chart paper, then circulate to review other groups' work and leave written feedback. Over eight to ten minutes, each student will identify one method they found more efficient than their own. The teacher will close by highlighting the most productive disagreement observed. [Insert at least 35 words]","Tiered Practice":"The teacher will provide a problem set on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] organized into three tiers: problems every student must complete, problems most students should complete, and challenge problems for students ready to extend. Over eight to ten minutes, students will progress at their own pace while the teacher targets support toward those still working in the first tier. [Insert at least 35 words]","IXL Independent Practice":"Students will work independently on [Insert IXL skill that aligns with the lesson topic, central focus, and learning objectives] while the teacher circulates with the live diagnostic view open. Over eight to ten minutes, the teacher will intervene with students whose SmartScore is declining, using the missed-question explanations to determine whether each error is conceptual or procedural. [Insert at least 35 words]","Chunked Practice with Checkpoints":"Students will complete two problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], then stop for a whole-class check before continuing. Over eight to ten minutes, the teacher will run roughly three such cycles, correcting errors before they are practiced repeatedly. The structure prevents students from completing an entire set incorrectly before anyone notices. [Insert at least 35 words]","Peer Error Check":"After completing a short problem set on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], students will exchange papers and check each other's work, marking the specific step where an error first appears rather than simply marking the answer wrong. Over eight to ten minutes, the teacher will require disagreeing pairs to resolve the discrepancy themselves before asking for help. [Insert at least 35 words]","Desmos Teacher-Paced Activity":"Students will complete a teacher-paced Desmos Classroom activity on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] while the teacher monitors the live dashboard. Over eight to ten minutes, the teacher will pause the class to display anonymized student responses, using genuine student work to drive discussion before releasing the next screen. [Insert at least 35 words]","Other":"[Insert guided practice description that aligns with the lesson topic, central focus, and learning objectives. Specify what students do, the eight to ten minute time frame, how the teacher supports without solving, and how understanding is checked before independent practice begins.] [Insert at least 35 words]"};
const STATIC_GUIDED = ["Test"];
const GUIDED_PRACTICE_PROMPTS = {
  "Lecture on Interactive TV":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using Lecture on Interactive TV. Do NOT begin with a title, heading, or label. Start directly with what the teacher and students do. Teacher uses colored markers to model problems on the large interactive TV while students take guided notes.`,
  "Group Jam":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using IXL Group Jam. Do NOT begin with a title, heading, or label. Start directly with what students and teacher do. Name specific relevant IXL skill areas.`,
  "Review: Study Guide":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using a Study Guide review. Do NOT begin with a title, heading, or label. Start directly with what the teacher and students do together.`,
  "Pre-Quiz":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using a Pre-Quiz. Do NOT begin with a title, heading, or label. Start directly with what students and teacher do. Describe it as mirroring the upcoming quiz with different numbers.`,
  "Quiz":(c,t)=>`${t||""}`,
  "Individual Whiteboards":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using Individual Whiteboards. Do NOT begin with a title, heading, or label. Start directly with what the teacher and students do step by step.`,
  "Scavenger Hunt":(c,t)=>`In 65 words or fewer, describe guided practice for a ${c} lesson on "${t}" using a Scavenger Hunt. Do NOT begin with a title, heading, or label. Start directly with what students and teacher do, and briefly describe the station problem types.`,
  "Other":(c,t)=>`In 65 words or fewer, describe a creative guided practice activity for a ${c} lesson on "${t}". Do NOT begin with a title, heading, or label. Start directly with what the teacher and students do together.`,
};
const INDEPENDENT_PRACTICE_OPTIONS = ["Worksheet","Individual IXL","Assessment","Study Guide","Pre-Quiz","Individual Whiteboards","Scavenger Hunt","Task Cards (Self-Checking)","Spiral Mixed Review","Application Task","Corrections and Error Log","Written Justification","Fluency Drill","IXL Diagnostic Arena","Self-Checking Puzzle","Reference Sheet Build","Homework Launch","Other"];
const INDEPENDENT_PRACTICE_TEXT = {"Worksheet":"Students will independently complete problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] for ten to fifteen minutes, referring to their guided notes worksheet from earlier instruction as needed. The teacher will circulate, offering targeted support and noting which problems generate the most questions. Students will check answers at posted checkpoints so errors are caught before the full set is completed. [Insert at least 35 words]","Individual IXL":"Students will work on the assigned IXL skill for [Insert skill that aligns with the lesson topic, central focus, and learning objectives] on their Chromebooks for ten to fifteen minutes while the teacher monitors the Live Classroom dashboard. The teacher will circulate to students whose SmartScore is falling, using the missed-question explanations to determine whether the error is conceptual or procedural. Guided notes remain available as reference. [Insert at least 35 words]","Assessment":"Students who finish [Insert assessment name] will complete an Exit Ticket reflecting on the quiz — identifying which questions felt uncertain and why — then begin working in the IXL Diagnostic Arena. The routine keeps early finishers productively engaged for the remaining ten to fifteen minutes and gives the teacher self-reported confidence data to pair against the actual scores. [Insert at least 35 words]","Study Guide":"Students will work through the Study Guide independently, since the teacher has already modeled and guided several problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. Over ten to fifteen minutes, the teacher will circulate and offer individualized support, referring students back to the earlier guided notes rather than reworking the problem for them. [Insert at least 35 words]","Pre-Quiz":"Students will score their own Pre-Quiz against a posted key, then spend the remaining ten to fifteen minutes reworking every missed problem and writing what went wrong beside each one. The teacher will circulate with the item-level data and will pull the single most-missed question for a brief whole-class clarification once most students have finished their corrections. [Insert at least 35 words]","Individual Whiteboards":"Students will practice independently on individual whiteboards for ten to fifteen minutes, erasing and reattempting as needed on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. The teacher will circulate, providing feedback tailored to each student's work, prompting self-assessment, flagging common mistakes, and pairing students who are struggling with peers who have demonstrated the skill. [Insert at least 35 words]","Scavenger Hunt":"Students will rotate through the scavenger hunt stations in their groups, solving a problem at each station and using the answer to locate the next one, continuing until all stations are complete. Over ten to fifteen minutes, the teacher will monitor progress from the help station, provide targeted support, and observe student interactions to identify skills needing additional instruction. [Insert at least 35 words]","Task Cards (Self-Checking)":"Students will work through a set of task cards on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], each with a QR code or answer bank confirming the solution before students move on. Over ten to fifteen minutes, students will progress at their own pace with immediate feedback while the teacher focuses on students whose self-checks reveal a repeated error pattern. [Insert at least 35 words]","Spiral Mixed Review":"Students will complete a mixed problem set drawn from [Insert current topic] and [Insert two or three previously taught units], with problem types deliberately interleaved rather than grouped. Over ten to fifteen minutes, students must first identify which method each problem requires — the skill that transfers to the ACT and to cumulative exams, where problems arrive unlabeled. [Insert at least 35 words]","Application Task":"Students will work one multi-step contextual problem on [Insert real-world scenario connected to today's topic], showing all reasoning and stating the answer in a complete sentence with correct units. Over ten to fifteen minutes, the teacher will circulate and prompt students who begin computing before determining what the problem is actually asking. [Insert at least 35 words]","Corrections and Error Log":"Students will rework each problem missed on [Insert assessment name] and record in an error log whether the mistake was conceptual, procedural, or careless. Over ten to fifteen minutes, the teacher will circulate and conference briefly with students whose logs show conceptual errors, since those require reteaching rather than additional practice. [Insert at least 35 words]","Written Justification":"Students will produce a written explanation of their reasoning for one problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], in complete sentences, as though explaining to a classmate who was absent. Over ten to fifteen minutes, the teacher will circulate and push students to name properties and definitions rather than describing keystrokes. [Insert at least 35 words]","Fluency Drill":"Students will complete a self-paced fluency drill on [Insert facts to be automatized, such as integer operations, factoring patterns, or unit circle values]. Over ten to fifteen minutes, students will track their own accuracy and speed against their previous attempt. Automaticity here frees working memory for the multi-step reasoning in which these facts are embedded. [Insert at least 35 words]","IXL Diagnostic Arena":"Students will work in the IXL Diagnostic Arena for ten to fifteen minutes, answering adaptive questions that update their individual grade-level diagnostic while the teacher monitors the Live Classroom view. Because the Arena targets each student's own level rather than the day's lesson, it suits days when instruction ends early or when students finish an assessment at different times. [Insert at least 35 words]","Self-Checking Puzzle":"Students will complete a maze, riddle, or matching puzzle built on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], in which an incorrect answer leads to a dead end and signals the error immediately. Over ten to fifteen minutes, students will self-correct without teacher intervention while the teacher assists students who have stalled at the same step. [Insert at least 35 words]","Reference Sheet Build":"Students will build their own reference page for [Insert topic that aligns with the lesson topic, central focus, and learning objectives], recording the procedure in their own words, one worked example, and the most common error to avoid. Over ten to fifteen minutes, students will produce a study tool for the upcoming assessment; writing the procedure independently exposes gaps that copying notes conceals. [Insert at least 35 words]","Homework Launch":"Students will begin the assigned homework on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] during the final ten to fifteen minutes of class. The teacher will circulate to catch procedural errors before students practice them incorrectly at home, confirming that every student can complete at least the first two problems unassisted before leaving. [Insert at least 35 words]","Other":"[Insert independent practice description that aligns with the lesson topic, central focus, and learning objectives. Specify what students complete independently, the ten to fifteen minute time frame, what reference materials remain available, and how the teacher monitors and documents progress.] [Insert at least 35 words]"};
const LESSON_OPTIONS = ["Lecture on SMART TV","Group Jam","Watch Video","Review: Study Guide","Pre-Quiz","Quiz","Test/Exam","Individual Whiteboards","Scavenger Hunt","Faded Worked Examples","Guided Discovery","Desmos or Graphing Exploration","Two Methods Compared","Card Sort: Matching Representations","Student-Led Modeling","Small-Group Reteach","Post-Assessment Reteach","Justification & Rubric Modeling","Other"];
const LESSON_TEXT = {"Lecture on SMART TV":"The teacher will introduce new techniques and reinforce prior ones using strategies that support comprehension and retention, aligned to the lesson topic, central focus, and learning objectives. Worksheet problems will serve as guided notes. Over eight to ten minutes, the teacher will model example problems on the SMART TV using multiple marker colors for clarity while students annotate and follow along. [Insert at least 35 words]","Group Jam":"The teacher will launch an IXL Group Jam on [Insert IXL skill that aligns with the lesson topic, central focus, and learning objectives], with students responding on their Chromebooks. Over eight to ten minutes, the teacher will use the live response data to introduce new concepts and address misconceptions, displaying selected questions and solutions on the board for whole-class discussion. [Insert at least 35 words]","Watch Video":"The teacher will play an instructional video on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], pausing at key moments to check understanding. During the eight to ten minute segment, students will complete a short viewing guide recording the steps demonstrated and at least one question, which the teacher will address immediately afterward. [Insert at least 35 words]","Review: Study Guide":"The teacher will first ask which study guide items students found most difficult, then work those problems with the class rather than proceeding in printed order. Over eight to ten minutes, the teacher will solve the selected problems aloud, pausing frequently to explain key steps and draw out student reasoning on [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. [Insert at least 35 words]","Pre-Quiz":"The teacher will administer a Pre-Quiz that mirrors the upcoming quiz in question count, format, and difficulty, with only the numerical values changed. Students will complete it in eight to ten minutes as a readiness check rather than a graded assessment. The design builds familiarity and confidence while ensuring students study the underlying skills instead of memorizing specific answers. [Insert at least 35 words]","Quiz":"Students will complete [Insert assessment name] during the allotted time. The teacher will circulate to monitor progress, confirm that approved accommodations are in place, and maintain a quiet, focused environment. Students who finish early will [Insert early-finisher expectation, such as an assigned IXL skill or test corrections]. The teacher will note items that generate repeated questions for later reteaching. [Insert at least 35 words]","Test/Exam":"Students will complete [Insert assessment name] under testing conditions. The teacher will distribute approved materials and accommodations, state the time available, and maintain a quiet, productive testing atmosphere while circulating. Students who finish early will [Insert early-finisher expectation]. The teacher will record observations about pacing and common sticking points to inform the next unit. [Insert at least 35 words]","Individual Whiteboards":"The teacher will display a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and guide the class through it step by step while every student works simultaneously on an individual whiteboard. Because all responses are visible at once, the teacher can adjust pacing in real time, gradually shifting to partner work or independent practice as accuracy improves. [Insert at least 35 words]","Scavenger Hunt":"The teacher will assign students to small, ability-balanced groups and start each group at a different station to prevent congestion. Within eight to ten minutes, the teacher will review the tools available — graphing calculators, laminated reference aids, and scratch paper — explain how the help station operates, and confirm that every group understands how their answers determine the next station.","Faded Worked Examples":"The teacher will present a fully worked solution for [Insert topic that aligns with the lesson topic, central focus, and learning objectives], then a second example with two steps left blank, then a third with only the first step provided. Over eight to ten minutes, students will complete the missing steps, reducing cognitive load while building toward independent execution. [Insert at least 35 words]","Guided Discovery":"The teacher will provide a structured sequence of prompts leading students to derive [Insert rule, property, or formula being introduced today] before it is formally stated. Over eight to ten minutes, students will test cases, identify the pattern, and articulate the rule in their own words. The teacher will then supply the formal notation and vocabulary. [Insert at least 35 words]","Desmos or Graphing Exploration":"The teacher will direct students to manipulate a prepared Desmos or graphing calculator activity involving [Insert parameter, transformation, or function family being studied]. Over eight to ten minutes, students will change one variable at a time and record its effect on the graph, generating the generalization the lesson then formalizes. [Insert at least 35 words]","Two Methods Compared":"The teacher will solve the same problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] using two valid methods, presented side by side. Over eight to ten minutes, students will compare the approaches for efficiency and accuracy and identify when each is preferable, establishing that procedures are chosen strategically rather than by default. [Insert at least 35 words]","Card Sort: Matching Representations":"The teacher will distribute cards containing equations, graphs, tables, and verbal descriptions related to [Insert topic that aligns with the lesson topic, central focus, and learning objectives]. Working in pairs for eight to ten minutes, students will match the representations and justify each grouping. The teacher will circulate, then debrief the mismatches that reveal the most common misconceptions. [Insert at least 35 words]","Student-Led Modeling":"The teacher will select a student to work a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] at the board while narrating each step, with classmates verifying or respectfully challenging the reasoning. Over eight to ten minutes, the teacher will facilitate rather than solve, intervening only to redirect misconceptions and name precise mathematical language. [Insert at least 35 words]","Small-Group Reteach":"Using recent IXL, quiz, or exit ticket data, the teacher will pull a targeted small group for reteaching on [Insert specific skill gap identified in the data] while the remaining students continue assigned practice. The eight to ten minute pull delivers intensive instruction at the point of need without holding back students who have already demonstrated mastery. [Insert at least 35 words]","Post-Assessment Reteach":"The teacher will return graded [Insert assessment name] and reteach the two or three items missed most frequently, showing both the error pattern and the correct reasoning. Over eight to ten minutes, students will annotate their own papers, identifying whether each error was conceptual, procedural, or careless, before beginning corrections. [Insert at least 35 words]","Justification & Rubric Modeling":"The teacher will model how to write a complete mathematical justification for [Insert problem type from the ACT, state assessment, or AP Precalculus exam], showing what earns credit and what does not. Over eight to ten minutes, students will compare a full-credit response against a partial-credit response and identify exactly what the weaker response failed to communicate. [Insert at least 35 words]","Other":"[Insert lesson description that aligns with the lesson topic, central focus, and learning objectives. Specify the instructional move, the eight to ten minute time frame, what students produce during the segment, and how understanding is checked before guided practice begins.] [Insert at least 35 words]"};
const CONCLUSION_OPTIONS = ["Standard Exit Ticket (Two Problems)","Digital Exit Ticket","Rate and Reflect","Confidence Check","Self-Sorted Exit Ticket","3-2-1","One-Sentence Summary","Muddiest Point","Explain to an Absent Classmate","Error Spotting Exit Ticket","Vocabulary & Notation Check","Learning Target Revisit","Whip Around","Student Recap","Bridge to Tomorrow","Real-World Connection","IXL Progress Snapshot","Assessment Day Closure","Homework & Study Guide Check-Out","Other"];
const CONCLUSION_TEXT = {"Standard Exit Ticket (Two Problems)":"Students will complete two problems on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] — one procedural, one applied — and submit them before leaving. The teacher will sort the tickets into three stacks during the passing period, using the results to set tomorrow's warm-up and to identify students for small-group reteaching. [Insert at least 25 words]","Digital Exit Ticket":"Students will complete a short Google Form, Desmos, or IXL exit ticket on their Chromebooks during the final three to five minutes. Because responses are collated automatically, the teacher will have item-level data before the next class period and can identify by name which students need reteaching. [Insert at least 25 words]","Rate and Reflect":"Students will reflect on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and rate their confidence from one to five on how well they understood the material, how well they could explain it to a peer, and how well they think they will be able to do it independently the next day. [Insert at least 25 words]","Confidence Check":"Students will work one problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and rate their confidence from one to five beside the answer. The three to five minute check pairs performance against self-perception, identifying both students who need help and students who do not yet recognize that they do. [Insert at least 25 words]","Self-Sorted Exit Ticket":"Students will complete one problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] and place it in one of three labeled bins: got it, almost, or lost. The teacher will verify each self-placement against the actual work, and the sorted stacks become tomorrow's small-group rosters without further analysis. [Insert at least 25 words]","3-2-1":"Students will write three things they learned, two questions they still have, and one connection to previously studied material. Over three to five minutes, the format produces both content evidence and a question bank the teacher can use to open the next class period. [Insert at least 25 words]","One-Sentence Summary":"Students will state the day's central idea in a single complete sentence, without using examples or numbers. The three to five minute constraint forces students to decide what mattered most, and the sentences reveal quickly whether students absorbed the underlying concept or only the procedure. [Insert at least 25 words]","Muddiest Point":"Students will identify the one part of today's lesson that remains least clear and explain what specifically confuses them about it. Within three to five minutes, the teacher will collect responses and open the following class by addressing the most frequently named point. [Insert at least 25 words]","Explain to an Absent Classmate":"Students will write directions for solving a problem on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] as though a classmate had been absent, using words rather than symbols alone. The three to five minute task exposes whether students understand why each step works or have only memorized the sequence. [Insert at least 25 words]","Error Spotting Exit Ticket":"Students will examine a worked solution on [Insert topic that aligns with the lesson topic, central focus, and learning objectives] containing one error, identify the step where it occurs, and explain the misconception behind it. Within three to five minutes, the teacher will collect responses; students who cannot locate the error have not yet internalized the procedure. [Insert at least 25 words]","Vocabulary & Notation Check":"Students will define [Insert term or notation introduced today] in their own words and supply one example and one non-example. The three to five minute check confirms precise mathematical language before the term is used as a building block in the next lesson. [Insert at least 25 words]","Learning Target Revisit":"The teacher will redisplay today's objective and standard, [Insert MSCCRS or AP Precalculus standard], and students will rate their mastery of it while citing one piece of evidence from their own work. The three to five minute revisit closes the loop opened at the beginning of class. [Insert at least 25 words]","Whip Around":"Moving around the room, each student will state one thing they learned, one question they still have, or one word describing today's lesson, with no repeats permitted. The three to five minute verbal closure requires every student to contribute and gives the teacher an immediate read on the room. [Insert at least 25 words]","Student Recap":"A selected student will summarize the day's lesson aloud while classmates add anything omitted. Over three to five minutes, the teacher will listen for missing or misstated steps and correct them publicly, ensuring the summary students carry out the door is accurate. [Insert at least 25 words]","Bridge to Tomorrow":"The teacher will pose a question that today's lesson cannot yet answer but tomorrow's will, connected to [Insert next lesson's topic]. Students will record a prediction within three to five minutes. The unresolved question creates continuity between periods and gives tomorrow's anticipatory set a ready starting point. [Insert at least 25 words]","Real-World Connection":"Students will name one situation outside the classroom where [Insert topic that aligns with the lesson topic, central focus, and learning objectives] would apply and briefly explain how. Within three to five minutes, the teacher will read two responses aloud, reinforcing relevance and collecting authentic contexts for use in future problems. [Insert at least 25 words]","IXL Progress Snapshot":"Students will record their current SmartScore for [Insert assigned IXL skill] and set a specific target for the next session. The three to five minute log makes progress visible to students, and the teacher will review the entries to identify students whose scores have stalled or declined. [Insert at least 25 words]","Assessment Day Closure":"After submitting [Insert assessment name], students will complete a brief reflection identifying which questions felt uncertain and what they would study differently next time. The three to five minute reflection gives the teacher self-reported data to compare against actual scores and shapes how results are returned. [Insert at least 25 words]","Homework & Study Guide Check-Out":"The teacher will state the homework assignment on [Insert topic that aligns with the lesson topic, central focus, and learning objectives], confirm the due date, and identify which study guide sections it supports. Within three to five minutes, students will record the assignment and the teacher will verify that every student knows the first step before dismissal. [Insert at least 25 words]","Other":"[Insert exit ticket and conclusion description that aligns with the lesson topic, central focus, and learning objectives. Specify what students produce, the three to five minute time frame, how the lesson is closed, and how the teacher uses the resulting data.] [Insert at least 25 words]"};
const INDEPENDENT_PRACTICE_PROMPTS = {
  "Worksheet":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" using a Worksheet. Do NOT begin with a title, heading, or label. Start directly with what students do and briefly describe the problem types.`,
  "Individual IXL":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" using Individual IXL. Do NOT begin with a title, heading, or label. Start directly with what students do. Name specific relevant IXL skill areas.`,
  "Assessment":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" during Assessment day. Do NOT begin with a title, heading, or label. Start directly. After the assessment, students complete an Exit Ticket then work on IXL Diagnostic Arena.`,
  "Study Guide":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" using a Study Guide. Do NOT begin with a title, heading, or label. Start directly with what students do independently.`,
  "Pre-Quiz":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" following a Pre-Quiz. Do NOT begin with a title, heading, or label. Start directly. Teacher reviews data and conducts targeted review based on results.`,
  "Individual Whiteboards":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" using Individual Whiteboards. Do NOT begin with a title, heading, or label. Start directly with what students do and how the teacher provides personalized feedback.`,
  "Scavenger Hunt":(c,t)=>`In 65 words or fewer, describe independent practice for a ${c} lesson on "${t}" using a Scavenger Hunt. Do NOT begin with a title, heading, or label. Start directly with what students do at stations and briefly describe the problem types.`,
  "Other":(c,t)=>`In 65 words or fewer, describe a creative independent practice activity for a ${c} lesson on "${t}". Do NOT begin with a title, heading, or label. Start directly with what students do independently.`,
};
const HMW_OPTIONS = ["None","Kuta Works","Writing Assignment","Complete any Late IXL Skills","Finish Worksheet","Study for Summative","Project"];
const HMW_PROMPTS = {
  "Writing Assignment":(c,t)=>`In 65 words or fewer, describe a math writing assignment for a ${c} lesson on "${t}". Do NOT begin with a title or heading. Student explains a concept or describes a problem-solving process.`,
  "Complete any Late IXL Skills":()=>`Students complete any late IXL skills. Log into IXL and work to reach the required score.`,
  "Finish Worksheet":(c,t)=>`Students finish remaining problems on today's worksheet for ${t}. Show all work clearly.`,
  "Study for Summative":(c,t,n)=>`Students study for the upcoming ${n?`"${n}"`:"summative assessment"}. Review guided notes, practice similar problems, and use IXL skills for ${t}.`,
  "Project":(c,t)=>`In 65 words or fewer, describe a math project assignment for a ${c} lesson on "${t}". Do NOT begin with a title or heading. Students apply today's concepts to a hands-on or creative task that demonstrates deeper understanding.`,
};
const FORMATIVE_OPTIONS = ["Worksheet","Live Classroom","Group Jam","Study Guide","Exit Ticket","Pre-Quiz","Discussion"];
const ACCOMMODATIONS = [
  {key:"read_aloud",label:"Read the Instructions Aloud"},{key:"laminate",label:"Laminate Memory Aid"},
  {key:"visual_aids",label:"Visual Aids"},{key:"manipulatives",label:"Manipulatives"},
  {key:"primary_calc",label:"Primary Calculator"},{key:"scientific_calc",label:"Scientific Calculator"},
  {key:"ti83",label:"TI-83 Graphing Calculator"},{key:"binder",label:"Binder: Access to Old Worksheets"},
  {key:"study_guide",label:"Study Guide"},{key:"scrap_paper",label:"Scrap Paper"},
  {key:"extended",label:"Extended Time"},{key:"movement",label:"Movement Breaks"},
];
const DEFAULT_SETTINGS = {
  darkMode:false,zoom:100,
  courseColors:{
    "7th Grade Math":{bg:"#16a34a",light:"#f0fdf4",border:"#86efac",text:"#14532d"},
    "8th Grade Math":{bg:"#2563eb",light:"#eff6ff",border:"#93c5fd",text:"#1e3a8a"},
    "Algebra I":{bg:"#ea580c",light:"#fff7ed",border:"#fdba74",text:"#7c2d12"},
    "Algebra II":{bg:"#dc2626",light:"#fef2f2",border:"#fca5a5",text:"#7f1d1d"},
    "Geometry":{bg:"#9333ea",light:"#faf5ff",border:"#c4b5fd",text:"#4c1d95"},
    "Algebra III":{bg:"#ca8a04",light:"#fefce8",border:"#fde047",text:"#713f12"},
    "6th Grade Math":{bg:"#16a34a",light:"#f0fdf4",border:"#86efac",text:"#14532d"},
    "7th/8th Grade Math":{bg:"#2563eb",light:"#eff6ff",border:"#93c5fd",text:"#1e3a8a"},
    "Essentials":{bg:"#ca8a04",light:"#fefce8",border:"#fde047",text:"#713f12"},
  },
  heatmapThresholds:[{max:0,color:"#e5e7eb"},{max:0.25,color:"#fecaca"},{max:0.5,color:"#fed7aa"},{max:0.75,color:"#fef08a"},{max:1.01,color:"#bbf7d0"}],
  apiKey:"",aiProvider:"gemini",aiModel:"gemini-flash",
  teacherName:"Dr. Derrick DeMars",schoolName:"Innova Preparatory School",location:"Hattiesburg, MS",
  defaultTerm:"Term I",
  showAutoSaveIndicator:true,
  autoBackupEnabled:true,backupInterval:40,maxBackupsPerSession:20,maxSessions:10,
};
const FIELDS = [
  {key:"lessonTitle",label:"Lesson Topic",type:"lessonTitle"},
  {key:"centralFocus",label:"Central Focus",type:"textarea"},
  {key:"priorKnowledge",label:"Prior Knowledge & Misconceptions",type:"textarea"},
  {key:"keyVocab",label:"Key Vocabulary",type:"textarea"},
  {key:"objectives",label:"Learning Objectives",type:"textarea"},
  {key:"essentialQs",label:"Essential Questions",type:"textarea"},
  {key:"bellWork",label:"Bell Work",type:"bellwork"},
  {key:"anticipatorySet",label:"Anticipatory Set",type:"anticipatory"},
  {key:"lesson",label:"Lesson",type:"lesson"},
  {key:"guidedPractice",label:"Guided Practice",type:"guidedpractice"},
  {key:"independentPractice",label:"Independent Practice",type:"indpractice"},
  {key:"conclusion",label:"Exit Ticket & Conclusion",type:"conclusion"},
  {key:"accommodations",label:"Accommodations",type:"accommodations"},
  {key:"assessment",label:"Assessment",type:"assessment"},
  {key:"hmw",label:"Homework",type:"hmw"},
  {key:"smps",label:"SMPs",type:"textarea"},
  {key:"msccrs",label:"MSCCRS",type:"textarea"},
];
// Row list for the "Edit Lesson Plan" tab only: drops Prior Knowledge, Key Vocabulary
// and SMPs, merges MSCCRS + Learning Objectives into one combined row, and relabels
// Conclusion. Lesson now lives in FIELDS itself, so it flows through to exports and
// the Daily View rather than being spliced in here.
const EDIT_TAB_FIELDS = FIELDS
  .filter(f=>f.key!=="priorKnowledge"&&f.key!=="keyVocab"&&f.key!=="smps"&&f.key!=="msccrs")
  .map(f=>{
    // Fused into ONE textbox for editing, but still stored as two fields. Everything
    // downstream (print/PDF export, completeness scoring, carry-forward, the Claude
    // import parser and Pacing Guide Paste) reads msccrs and objectives separately, so
    // keeping them split underneath means none of that has to change.
    if(f.key==="objectives")return{...f,label:"MSCCRS & Learning Objectives",fused:[
      {key:"msccrs",label:"MSCCRS"},
      {key:"objectives",label:"Objectives"},
    ]};
    return f;
  })
  // Helpful Links sits directly below Homework. Edit-tab only for now — it is not in
  // FIELDS, so exports and the Daily View are unaffected.
  .flatMap(f=>f.key==="hmw"
    ?[f,{key:"helpfulLinks",label:"Helpful Links",type:"links"}]
    :[f]);
// The single definition of "complete" used by every percentage in the app: the per-day
// rings in the Edit Lesson Plan tab, the plan cards in My Lesson Plans, the Progress
// heatmap and the gap-detail modal. Scores the first 10 rows — the instructional content
// a teacher actually fills in. Rows 11-13 (Accommodations, Assessment, Homework) are
// excluded, as are the fields the edit tab hides entirely (Prior Knowledge, Key
// Vocabulary, SMPs), which could never be filled there and so permanently dragged the
// percentage down. Derived from EDIT_TAB_FIELDS so reordering rows keeps this in sync;
// the fused row expands to its two underlying fields (msccrs, objectives).
const COMPLETION_KEYS=EDIT_TAB_FIELDS.slice(0,10).flatMap(f=>f.fused?f.fused.map(sf=>sf.key):[f.key]);
const SUGGESTION_FIELDS = [
  {key:"sugDifferentiation",label:"Differentiation Tiers"},
  {key:"sugPacing",label:"Pacing Warnings"},
  {key:"sugEnhancements",label:"Enhancement Suggestions"},
];
const ALL_ROW_KEYS=[...FIELDS.map(f=>f.key),...SUGGESTION_FIELDS.map(f=>f.key)];
function mdToHtml(text){if(!text)return"";var s=text;s=s.replace(/!!(.+?)!!/g,'\x00R$1\x01');s=s.replace(/==(.+?)==/g,'\x00Y$1\x01');s=s.replace(/\*\*(.+?)\*\*/g,'\x00B$1\x01');s=s.replace(/__(.+?)__/g,'\x00U$1\x01');s=s.replace(/~~(.+?)~~/g,'\x00S$1\x01');s=s.replace(/\*(.+?)\*/g,'\x00I$1\x01');s=s.replace(/\x00R(.*?)\x01/g,'<mark style="background:#fecaca;padding:0 2px;border-radius:2px">$1</mark>');s=s.replace(/\x00Y(.*?)\x01/g,'<mark style="background:#fef08a;padding:0 2px;border-radius:2px">$1</mark>');s=s.replace(/\x00B(.*?)\x01/g,'<b>$1</b>');s=s.replace(/\x00U(.*?)\x01/g,'<u>$1</u>');s=s.replace(/\x00S(.*?)\x01/g,'<s>$1</s>');s=s.replace(/\x00I(.*?)\x01/g,'<i>$1</i>');return s;}
function hasMdFormatting(text){if(!text)return false;return/\*\*.+?\*\*|\*[^*]+?\*|__.+?__|~~.+?~~|==.+?==|!!.+?!!/.test(text);}
function stripMdFormatting(text){if(!text)return"";return text.replace(/!!(.+?)!!/g,"$1").replace(/==(.+?)==/g,"$1").replace(/\*\*(.+?)\*\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/~~(.+?)~~/g,"$1").replace(/\*(.+?)\*/g,"$1");}
const PACING_ROW_TYPES=["Instruction","Quiz","Exam","Review","Benchmark","Writing Day","No Class"];
const PACING_TYPE_CONFIG={"Instruction":{merged:false,rowBg:"",wrap:t=>t},"Quiz":{merged:false,rowBg:"",wrap:t=>t?`**${stripMdFormatting(t)}**`:t},"Exam":{merged:false,rowBg:"",wrap:t=>t?`**${stripMdFormatting(t)}**`:t},"Review":{merged:false,rowBg:"",wrap:t=>t?`*${stripMdFormatting(t)}*`:t},"Benchmark":{merged:false,rowBg:"",wrap:t=>t?`**${stripMdFormatting(t)}**`:t},"Writing Day":{merged:false,rowBg:"",wrap:t=>t?`__${stripMdFormatting(t)}__`:t},"No Class":{merged:true,rowBg:"#dbdfe3",wrap:t=>t},"No School":{merged:true,rowBg:"#dbdfe3",wrap:t=>t},"Break/Holiday":{merged:true,rowBg:"#dbdfe3",wrap:t=>t},"Class Canceled":{merged:true,rowBg:"#dbdfe3",wrap:t=>t},"Field Trip":{merged:true,rowBg:"#dbdfe3",wrap:t=>t}};
function parseWeekLabel(w){if(!w)return{term:"",weekNum:""};const m=w.match(/^(Term\s+[IVX]+)\s*(\d+)?$/i);if(m)return{term:m[1],weekNum:m[2]?`Week ${m[2]}`:""};return{term:w,weekNum:""};}
const DAY_FULL={"Mon":"Monday","Tue":"Tuesday","Wed":"Wednesday","Thu":"Thursday","Fri":"Friday"};
function parsePacingDate(s){if(!s)return null;const m=s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);if(!m)return null;const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};const mi=months[m[2].slice(0,3).toLowerCase()];if(mi===undefined)return null;const year=m[3].length===2?2000+parseInt(m[3],10):parseInt(m[3],10);return new Date(year,mi,parseInt(m[1],10));}
function formatPacingDate(d){if(!d)return"";const mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];return`${d.getDate()} ${mo} ${String(d.getFullYear()).slice(-2)}`;}
function nextWeekday(d){const next=new Date(d);next.setDate(next.getDate()+1);while(next.getDay()===0||next.getDay()===6){next.setDate(next.getDate()+1);}return next;}
function prevWeekday(d){const prev=new Date(d);prev.setDate(prev.getDate()-1);while(prev.getDay()===0||prev.getDay()===6){prev.setDate(prev.getDate()-1);}return prev;}
function suggestPacingDateRange(rows,rowIndices){if(!rowIndices||rowIndices.length===0)return"";const sorted=[...rowIndices].sort((a,b)=>a-b);const firstIdx=sorted[0];const lastIdx=sorted[sorted.length-1];const firstDate=rows[firstIdx]?.date||"";const lastDate=rows[lastIdx]?.date||"";if(firstDate&&lastDate){return firstDate===lastDate?firstDate:`${firstDate} \u2013 ${lastDate}`;}let startDate=firstDate?parsePacingDate(firstDate):null;let endDate=lastDate?parsePacingDate(lastDate):null;if(!startDate){for(let i=firstIdx-1;i>=0;i--){const p=parsePacingDate(rows[i]?.date);if(p){startDate=p;for(let j=0;j<=firstIdx-i-1;j++)startDate=nextWeekday(startDate);break;}}}
  if(!endDate){for(let i=lastIdx+1;i<rows.length;i++){const p=parsePacingDate(rows[i]?.date);if(p){endDate=p;for(let j=0;j<=i-lastIdx-1;j++)endDate=prevWeekday(endDate);break;}}}
  if(startDate&&endDate){const s=formatPacingDate(startDate);const e=formatPacingDate(endDate);return s===e?s:`${s} \u2013 ${e}`;}if(startDate)return formatPacingDate(startDate);if(endDate)return formatPacingDate(endDate);return"";}
function FormattedCell({value,onChange,rows,placeholder,style,onFocus,onBlur,id}){const[editing,setEditing]=React.useState(false);const taRef=React.useRef(null);const overlayRef=React.useRef(null);const handleFocus=()=>{setEditing(true);if(onFocus)onFocus(taRef);};const handleBlur=(e)=>{const rt=e.relatedTarget||document.activeElement;if(rt&&(rt.closest("[data-fmt-sidebar]")||rt.hasAttribute("data-fmt-btn")))return;setEditing(false);if(onBlur)onBlur();};React.useEffect(()=>{if(editing&&taRef.current)taRef.current.focus();},[editing]);React.useEffect(()=>{if(editing&&taRef.current&&overlayRef.current){overlayRef.current.scrollTop=taRef.current.scrollTop;}},[value,editing]);const cellLineHeight="1.4";const sharedStyle={...style,lineHeight:cellLineHeight,fontFamily:"Tahoma,sans-serif",fontSize:14,padding:"5px 7px",boxSizing:"border-box",width:"100%"};const hasContent=value&&String(value).trim();const rendered=hasMdFormatting(value)?mdToHtml((value||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>")):(hasContent?(value||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>"):"");if(editing){return React.createElement("div",{style:{position:"relative",width:"100%"}},React.createElement("textarea",{ref:taRef,id,value:value||"",onChange:e=>onChange(e.target.value),rows,placeholder,style:{...sharedStyle,color:"transparent",caretColor:"#1e2a3a",background:"transparent",border:`1px solid ${style?.borderColor||"#c8cdd6"}`,borderRadius:4,resize:"vertical",minHeight:80,position:"relative",zIndex:2},onBlur:handleBlur,onScroll:e=>{if(overlayRef.current)overlayRef.current.scrollTop=e.target.scrollTop;}}),React.createElement("div",{ref:overlayRef,style:{...sharedStyle,position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",whiteSpace:"pre-wrap",wordWrap:"break-word",border:"1px solid transparent",borderRadius:4,minHeight:80,zIndex:1,background:style?.background||"#fff"},dangerouslySetInnerHTML:{__html:rendered||`<span style="opacity:0.45">${placeholder||""}</span>`}}));}return React.createElement("div",{onClick:handleFocus,style:{...sharedStyle,minHeight:80,cursor:"text",overflow:"auto",whiteSpace:"pre-wrap",border:`1px solid ${style?.borderColor||"#c8cdd6"}`,borderRadius:4,background:style?.background||"#fff"},dangerouslySetInnerHTML:{__html:rendered||`<span style="opacity:0.45">${placeholder||""}</span>`}});}
// Per-cell control pair in the Edit Lesson Plan tab: Copy (copies that field's text)
// followed by Options (the existing AI sparkle flow). Copying an empty field raises an
// error modal instead of silently putting nothing on the clipboard. Fields with no AI
// prompt behind them (e.g. Lesson) pass no onOptions and render Copy alone.
function CellActions({text,has,onOptions,options,setAppModal}){
  const [copied,setCopied]=React.useState(false);
  const doCopy=async()=>{
    const val=(text==null?"":String(text)).trim();
    if(!val){
      if(setAppModal)setAppModal({type:"alert",icon:"⚠️",title:"Nothing to Copy",message:"This field is empty. Enter some text before copying."});
      return;
    }
    let ok=false;
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(val);ok=true;}}catch(err){ok=false;}
    if(!ok){
      // Fallback for non-secure contexts, where navigator.clipboard is unavailable.
      try{
        const ta=document.createElement("textarea");
        ta.value=val;ta.style.position="fixed";ta.style.top="-1000px";ta.style.opacity="0";
        document.body.appendChild(ta);ta.focus();ta.select();
        ok=document.execCommand("copy");
        document.body.removeChild(ta);
      }catch(err){ok=false;}
    }
    if(ok){setCopied(true);setTimeout(()=>setCopied(false),1200);}
    else if(setAppModal)setAppModal({type:"alert",icon:"⚠️",title:"Copy Failed",warning:"Could not reach the clipboard. Select the text and copy it manually."});
  };
  const base={border:"none",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:"bold"};
  return(
    <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
      <button onClick={doCopy} title="Copy this field's text" style={{...base,background:copied?"#16a34a":"#ffffff",color:copied?"#ffffff":"#334155",border:`1px solid ${copied?"#16a34a":"#94a3b8"}`}}>{copied?"✓ Copied":"📋 Copy"}</button>
      {options
        ?options.map(o=><button key={o.label} onClick={o.onClick} style={{...base,background:o.has?"linear-gradient(135deg,#ea580c,#f97316)":"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff"}}>{"✨"} {o.label}</button>)
        :onOptions&&<button onClick={onOptions} style={{...base,background:has?"linear-gradient(135deg,#ea580c,#f97316)":"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff"}}>{"✨"} Options</button>}
    </div>
  );
}
// Dropdown that previews an option's template text while you hover it, so you can read
// what a choice inserts before committing to it. A native <select> can't do this —
// Chrome does not render title tooltips on <option>, and the OS-drawn popup gives no
// per-option hover events — so the list is rendered in-page. The popup and preview are
// position:fixed off the trigger's rect, otherwise the scrolling grid would clip them.
function PreviewSelect({value,options,textMap={},placeholder,onChange,style}){
  const [open,setOpen]=React.useState(false);
  const [hover,setHover]=React.useState(null);
  const [rect,setRect]=React.useState(null);
  const ref=React.useRef(null);
  React.useEffect(()=>{
    if(!open)return;
    const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    const onKey=e=>{if(e.key==="Escape")setOpen(false);};
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",onKey);
    return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",onKey);};
  },[open]);
  const toggle=()=>{
    if(!open&&ref.current)setRect(ref.current.getBoundingClientRect());
    setOpen(o=>!o);setHover(null);
  };
  const pick=v=>{onChange(v);setOpen(false);setHover(null);};
  // Flip the list above the trigger when there isn't room below.
  const maxH=280;
  const below=rect?window.innerHeight-rect.bottom:0;
  const dropUp=rect&&below<maxH&&rect.top>below;
  const listTop=rect?(dropUp?Math.max(4,rect.top-maxH):rect.bottom+2):0;
  const previewText=hover?(textMap[hover]||""):"";
  return(
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={toggle} style={{...style,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}} title={value?(textMap[value]||""):""}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:value?"inherit":"#6b7280"}}>{value||placeholder}</span>
        <span style={{fontSize:10,opacity:0.7,flexShrink:0}}>{open?"▲":"▼"}</span>
      </div>
      {open&&rect&&(
        <>
          <div style={{position:"fixed",left:rect.left,top:listTop,width:Math.max(rect.width,190),maxHeight:maxH,overflowY:"auto",background:"#fff",border:"1px solid #94a3b8",borderRadius:6,boxShadow:"0 6px 20px rgba(0,0,0,0.18)",zIndex:5000,fontSize:13}}>
            <div onClick={()=>pick("")} onMouseEnter={()=>setHover(null)} style={{padding:"6px 10px",cursor:"pointer",color:"#6b7280",borderBottom:"1px solid #e5e7eb",background:value===""?"#eff6ff":"transparent"}}>{placeholder}</div>
            {options.map(o=>(
              <div key={o} onClick={()=>pick(o)} onMouseEnter={()=>setHover(o)}
                style={{padding:"6px 10px",cursor:"pointer",background:hover===o?"#dbeafe":(value===o?"#eff6ff":"transparent"),color:"#1e2a3a",fontWeight:value===o?"bold":"normal"}}>{o}</div>
            ))}
          </div>
          {previewText&&(
            <div style={{position:"fixed",left:Math.min(rect.left+Math.max(rect.width,190)+8,window.innerWidth-330),top:listTop,width:320,maxHeight:maxH,overflowY:"auto",background:"#1e2a3a",color:"#f8fafc",border:"1px solid #0f172a",borderRadius:6,boxShadow:"0 6px 20px rgba(0,0,0,0.28)",zIndex:5001,padding:"10px 12px",fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",pointerEvents:"none"}}>
              <div style={{fontWeight:"bold",marginBottom:6,color:"#93c5fd"}}>{hover}</div>
              {previewText}
            </div>
          )}
        </>
      )}
    </div>
  );
}
const MSCCRS_COURSE_CONTEXT = {
  "7th Grade Math":`You are identifying 2016 MS CCRS standards for Grade 7 Mathematics. Valid domains: Ratios and Proportional Relationships (7.RP), The Number System (7.NS), Expressions and Equations (7.EE), Geometry (7.G), Statistics and Probability (7.SP). Use exact standard codes like 7.RP.A.2, 7.NS.A.1, 7.EE.B.4, 7.G.B.6, 7.SP.C.5, etc.`,
  "8th Grade Math":`You are identifying 2016 MS CCRS standards for 8th Grade Math, aligned to Grade 8 Mathematics with foundational Grade 7 content as needed. Grade 8 domains: The Number System (8.NS), Expressions and Equations (8.EE), Functions (8.F), Geometry (8.G), Statistics and Probability (8.SP). Grade 7 support domains when relevant: 7.RP, 7.NS, 7.EE, 7.G, 7.SP. Use exact standard codes like 8.EE.C.7, 8.F.A.2, 7.RP.A.2, etc.`,
  "Algebra I":`You are identifying 2016 MS CCRS standards for High School Algebra I. Valid domains: N-Q, A-SSE, A-APR, A-CED, A-REI, F-IF, F-BF, F-LE, S-ID. Use exact codes like A-SSE.A.1, F-IF.C.7, A-REI.B.4, etc.`,
  "Algebra II":`You are identifying 2016 MS CCRS standards for High School Algebra II. Valid domains: N-RN, N-CN, A-SSE, A-APR, A-CED, A-REI, F-IF, F-BF, F-LE, F-TF, S-ID, S-IC, S-CP. Use exact codes like N-CN.A.1, A-APR.B.3, F-TF.A.1, etc.`,
  "Geometry":`You are identifying 2016 MS CCRS standards for High School Geometry. Valid domains: G-CO, G-SRT, G-C, G-GPE, G-GMD, G-MG, S-CP. Use exact codes like G-CO.A.1, G-SRT.B.5, G-GPE.B.4, etc.`,
  "Algebra III":`You are identifying 2016 MS CCRS standards for High School Algebra III. Valid domains: N-CN, N-VM, A-APR, A-REI, F-IF, F-BF, F-TF, F-LE, G-SRT, G-GPE, S-CP. Use exact codes like F-TF.A.3, F-BF.B.4, N-CN.C.8, F-IF.C.7, A-APR.C.4, etc.`,
  // Legacy course names — kept so historical plans still generate standards correctly
  "6th Grade Math":`You are identifying 2016 MS CCRS standards for Grade 6 Mathematics. Valid domains: Ratios and Proportional Relationships (6.RP), The Number System (6.NS), Expressions and Equations (6.EE), Geometry (6.G), Statistics and Probability (6.SP). Use exact standard codes like 6.RP.A.1, 6.EE.B.7, etc.`,
  "7th/8th Grade Math":`You are identifying 2016 MS CCRS standards for a combined Grade 7 AND Grade 8 Mathematics course. You MUST draw from BOTH grade levels. Grade 7 domains: Ratios and Proportional Relationships (7.RP), The Number System (7.NS), Expressions and Equations (7.EE), Geometry (7.G), Statistics and Probability (7.SP). Grade 8 domains: The Number System (8.NS), Expressions and Equations (8.EE), Functions (8.F), Geometry (8.G), Statistics and Probability (8.SP). Include at least one standard from each grade level (7.x and 8.x) when applicable.`,
  "Essentials":`You are identifying standards for Essentials, aligned to SREB Math Ready / MS Algebra III. Draw from: A-SSE, A-APR, A-CED, A-REI, F-IF, F-BF, F-LE, F-TF, N-RN, N-CN, S-ID.`,
};
const AI_FIELD_PROMPTS = {
  centralFocus:(c,t)=>`In 1-2 phrases or sentences, describe the big idea or central focus and overall purpose of a ${c} lesson on "${t}". Maximum 45 words. No bullets or headings.`,
  priorKnowledge:(c,t)=>`For a ${c} lesson on "${t}", identify the key prior knowledge students need and 2-3 common misconceptions they may hold. Write in plain prose, no bullets or headings. Maximum 65 words.`,
  keyVocab:(c,t)=>`List exactly 10 key vocabulary terms for a ${c} lesson on "${t}". Comma-separated list only. No definitions, numbering, or bullets.`,
  objectives:(c,t)=>`Write exactly 2 learning objectives for a ${c} lesson on "${t}". Each begins with "SWBAT". One per line. No bullets or numbering.`,
  essentialQs:(c,t)=>`Write 2-3 open-ended essential questions for a ${c} lesson on "${t}". Number them 1-3. One per line. No extra commentary.`,
  msccrs:(c,t)=>{const ctx=MSCCRS_COURSE_CONTEXT[c]||`You are identifying 2016 MS CCRS standards for a ${c} mathematics course.`;return `${ctx}\n\nLesson topic: "${t}"\n\nIdentify ONLY the most directly relevant MS CCRS standard codes. List each as: [Code] – [Brief description]. Maximum 65 words total. No preamble.`;},
  smps:(c,t)=>`Identify which of the 8 Standards for Mathematical Practice apply to a ${c} lesson on "${t}". For each applicable SMP, write exactly one line in this format: SMP [#]: [Name] – [reason]. The reason must be 10 words or fewer AND under 50 characters. No exceptions. No extra commentary.`,
};
function getSystemPrompt(){return `You are an expert curriculum designer for ${_settings.teacherName}, a middle and high school math teacher at ${_settings.schoolName} in ${_settings.location}.
STUDENT POPULATION: Neurodiverse learners with ADHD, Autism, and Dyslexia.
CLASSROOM TOOLS: IXL, Kuta Software, GeoGebra, Desmos, Chromebooks, individual whiteboards, binders, large interactive TV, four-function/scientific/TI-83 calculators, manipulatives, laminated memory aids.
LESSON TITLE STRICT RULE: The Lesson Topic cell must NEVER exceed 10 words or 50 characters (including spaces).
FORMATTING: Never begin a cell with a heading, title, label, or preamble. Dive directly into content in plain prose.
SMP CRITICAL RULE: Each SMP line format: "SMP [#]: [Name] – [reason]" where reason is strictly 10 words or fewer AND under 50 characters.
COHERENCE RULE: Before generating any content, read the FULL WEEK CONTEXT provided. Every cell you write must build on, flow from, and fit with all existing content in the lesson plan — including the lesson topics, vocabulary, objectives, bell work, anticipatory sets, guided practice, independent practice, SMPs, standards, and homework already present. Content for a given day must feel like a natural continuation of prior days and a logical lead-in to later days. Never generate content that contradicts, ignores, or feels disconnected from what is already in the table.
Standards for Mathematical Practice:
SMP 1: Make sense of problems and persevere in solving them.
SMP 2: Reason abstractly and quantitatively.
SMP 3: Construct viable arguments and critique the reasoning of others.
SMP 4: Model with mathematics.
SMP 5: Use appropriate tools strategically.
SMP 6: Attend to precision.
SMP 7: Look for and make use of structure.
SMP 8: Look for and express regularity in repeated reasoning.`;}
const FIELD_TO_KEY = {bellWork:"bellWorkText",anticipatory:"anticipatoryText",guidedPractice:"guidedPracticeText",indPractice:"indPracticeText",conclusion:"conclusionText",hmw:"hmwText"};
const FIELD_DATA_KEYS = {
  bellWork:            ["bellWorkType","bellWorkText"],
  lessonTitle:         ["lessonTitle"],
  centralFocus:        ["centralFocus"],
  priorKnowledge:      ["priorKnowledge"],
  keyVocab:            ["keyVocab"],
  objectives:          ["objectives"],
  essentialQs:         ["essentialQs"],
  anticipatorySet:     ["anticipatorySelected","anticipatoryText"],
  guidedPractice:      ["guidedPracticeType","guidedPracticeLabel","guidedPracticeText"],
  independentPractice: ["indPracticeType","indPracticeText"],
  conclusion:          ["conclusionText"],
  accommodations:      ["accommodations"],
  assessment:          ["assessment"],
  hmw:                 ["hmwSelected","hmwOthers","hmwText"],
  smps:                ["smps"],
  msccrs:              ["msccrs"],
};
const FIELD_AI_KEY = {
  bellWork:            "bellWork",
  lessonTitle:         "lessonTitle",
  centralFocus:        "centralFocus",
  priorKnowledge:      "priorKnowledge",
  keyVocab:            "keyVocab",
  objectives:          "objectives",
  essentialQs:         "essentialQs",
  anticipatorySet:     "anticipatory",
  guidedPractice:      "guidedPractice",
  independentPractice: "indPractice",
  conclusion:          "conclusion",
  hmw:                 "hmw",
  smps:                "smps",
  msccrs:              "msccrs",
};
function parseLocalDate(iso){const [y,m,d]=iso.slice(0,10).split("-").map(Number);return new Date(y,m-1,d);}
function getWeekStart(d){const dt=new Date(d);dt.setHours(0,0,0,0);dt.setDate(dt.getDate()-dt.getDay());return dt;}
function formatDate(d){return `${String(d.getDate()).padStart(2,"0")} ${d.toLocaleDateString("en-US",{month:"short"})} ${String(d.getFullYear()).slice(-2)}`;}
function getWeekDates(sun){return Array.from({length:5},(_,i)=>{const d=new Date(sun);d.setDate(d.getDate()+1+i);return d;});}
function weekToISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function getDayISO(weekStartISO,dayName){const ws=parseLocalDate(weekStartISO);const d=new Date(ws);d.setDate(d.getDate()+1+DAYS.indexOf(dayName));return weekToISO(d);}
function defaultWeekStart(){const today=new Date();today.setHours(0,0,0,0);if(today.getDay()===0)return getWeekStart(today);const next=new Date(today);next.setDate(today.getDate()+(7-today.getDay()));return getWeekStart(next);}
function buildWeekOptions(){const opts=[],seen=new Set(),now=new Date();now.setHours(0,0,0,0);const sy=now.getFullYear();for(let yr=sy;yr<=sy+1;yr++){let d=getWeekStart(new Date(yr,0,1));for(let i=0;i<60;i++){if(d.getFullYear()>yr)break;const iso=weekToISO(d);if(!seen.has(iso)){seen.add(iso);opts.push(new Date(d));}d=new Date(d);d.setDate(d.getDate()+7);}}return opts;}
function WeekOption({d}){const iso=weekToISO(d);const wd=getWeekDates(d);return(<option value={iso}>{formatDate(wd[0])} – {formatDate(wd[4])}</option>);}
function emptyDay(){return{lessonTitle:"",keyVocab:"",objectives:"",essentialQs:"",bellWorkType:"",bellWorkText:"",anticipatorySelected:[],anticipatoryText:"",guidedPracticeType:"",guidedPracticeLabel:"",guidedPracticeText:"",indPracticeType:"",indPracticeText:"",lessonType:"",lesson:"",conclusionType:"",conclusionText:"",weeklyObjectives:"",helpfulLinks:[],hmwSelected:["None"],hmwOthers:[],hmwText:"",msccrs:"",smps:"",sugContentLength:"",sugDifferentiation:"",sugPacing:"",sugEnhancements:"",accommodations:{read_aloud:true,ti83:true,binder:true,extended:true,accOthers:[]},assessment:{form:[],formOthers:[],quizName:"",quizDate:""},aiGenerated:{},canceled:null};}
function emptyWeek(){return DAYS.reduce((a,d)=>({...a,[d]:emptyDay()}),{});}
function fillPlanData(pd){const filled={};for(const day of DAYS){filled[day]={...emptyDay(),...(pd[day]||{})};}return filled;}

function HighlightText({text,query}){
  if(!query)return text;
  const regex=new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");
  const parts=text.split(regex);
  return parts.map((part,i)=>regex.test(part)?<mark key={i} style={{background:"#fef08a",padding:"0 1px"}}>{part}</mark>:<span key={i}>{part}</span>);
}

function calcDayCompletion(dayData){
  if(!dayData||dayData.canceled)return -1;
  const total=COMPLETION_KEYS.length;
  return total>0?COMPLETION_KEYS.filter(k=>!isFieldEmpty(dayData,k)).length/total:0;
}
// Gap analysis walks FIELDS, but several rows are composites whose key is not a data
// key (conclusion -> conclusionType/conclusionText, bellWork -> bellWorkType/..., etc.).
// Reading p[key] directly reports those rows as permanently empty, so map each row to
// the fields it is actually stored in.
function isFieldEmpty(p,key){
  if(!p)return true;
  const txt=v=>!!(v&&String(v).trim());
  switch(key){
    case "bellWork":return !(txt(p.bellWorkType)||txt(p.bellWorkText));
    case "anticipatorySet":return !((p.anticipatorySelected||[]).length>0||txt(p.anticipatoryText));
    case "lesson":return !(txt(p.lessonType)||txt(p.lesson));
    case "guidedPractice":return !(txt(p.guidedPracticeType)||txt(p.guidedPracticeText));
    case "independentPractice":return !(txt(p.indPracticeType)||txt(p.indPracticeText));
    case "conclusion":return !(txt(p.conclusionType)||txt(p.conclusionText));
    case "accommodations":{const a=p.accommodations||{};return !(ACCOMMODATIONS.some(x=>a[x.key])||(a.accOthers||[]).length>0);}
    case "assessment":{const a=p.assessment||{};return !((a.form||[]).length>0||(a.formOthers||[]).length>0||txt(a.quizName));}
    // "None" is the default on an untouched day, so it does not count as a deliberate choice.
    case "hmw":return !((p.hmwSelected||[]).some(h=>h&&h!=="None")||(p.hmwOthers||[]).length>0||txt(p.hmwText));
    default:return !txt(p[key]);
  }
}
function calcPlanCompletion(planData){let sum=0,count=0;DAYS.forEach(d=>{const pct=calcDayCompletion(planData[d]);if(pct>=0){sum+=pct;count++;}});return count>0?sum/count:0;}
let _heatThresholds=[{max:0,color:"#e5e7eb"},{max:0.25,color:"#fecaca"},{max:0.5,color:"#fed7aa"},{max:0.75,color:"#fef08a"},{max:1.01,color:"#bbf7d0"}];
function heatColor(pct){for(let i=0;i<_heatThresholds.length;i++){if(pct<_heatThresholds[i].max)return _heatThresholds[i].color;}return _heatThresholds[_heatThresholds.length-1].color;}

const FIELD_WEIGHTS={lessonTitle:10,lesson:8,guidedPractice:8,independentPractice:8,conclusion:6,bellWork:6,anticipatorySet:6,objectives:3,essentialQs:3,keyVocab:2,msccrs:2,smps:2,accommodations:1,assessment:1,hmw:1};
function detectGaps(plans,schoolHolidays){
  const now=new Date();now.setHours(0,0,0,0);
  const dow=now.getDay();
  const thisSun=new Date(now);thisSun.setDate(now.getDate()-dow);
  const nextSun=new Date(thisSun);nextSun.setDate(thisSun.getDate()+7);
  const thisWeekISO=weekToISO(thisSun);
  const nextWeekISO=weekToISO(nextSun);
  const thisWeek=[],nextWeek=[];
  plans.forEach(plan=>{
    if(!plan.updatedAt)return;
    const isThis=plan.weekStart===thisWeekISO;
    const isNext=plan.weekStart===nextWeekISO;
    if(!isThis&&!isNext)return;
    const planGaps=[];
    let totalWeight=0;
    DAYS.forEach(day=>{
      const p=plan.planData[day];if(!p||p.canceled)return;
      const dayISO=getDayISO(plan.weekStart,day);if(schoolHolidays.includes(dayISO))return;
      FIELDS.forEach(f=>{
        if(isFieldEmpty(p,f.key)){const w=FIELD_WEIGHTS[f.key]||1;totalWeight+=w;planGaps.push({day,field:f.key,label:f.label,weight:w});}
      });
    });
    if(planGaps.length>0){
      planGaps.sort((a,b)=>b.weight-a.weight);
      const entry={plan,gaps:planGaps,totalWeight,gapCount:planGaps.length};
      if(isThis)thisWeek.push(entry);else nextWeek.push(entry);
    }
  });
  thisWeek.sort((a,b)=>b.totalWeight-a.totalWeight);
  nextWeek.sort((a,b)=>b.totalWeight-a.totalWeight);
  return{thisWeek,nextWeek};
}

// Helper: invoke the Claude CLI backend for a single cell via /api/complete-cells
// Wraps the SSE/result flow in a Promise so callers get a plain string back.
async function callCliForCell(day,field,currentText,editInstruction,planForSkill,signal=null){
  const body={plan:planForSkill,cells:[{day,field,currentText:currentText||""}],instruction:editInstruction||"",mode:editInstruction?"edit":"generate"};
  const resp=await fetch("http://localhost:5175/api/complete-cells",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal});
  if(!resp.ok){const err=await resp.json().catch(()=>({error:resp.statusText}));throw new Error(err.error||`HTTP ${resp.status}`);}
  const {jobId}=await resp.json();
  return await new Promise((resolve,reject)=>{
    const es=new EventSource(`http://localhost:5175/api/complete-cells/${jobId}/events`);
    let settled=false;
    const finish=(fn)=>{if(settled)return;settled=true;try{es.close();}catch{}fn();};
    if(signal){signal.addEventListener("abort",()=>{finish(()=>{fetch(`http://localhost:5175/api/complete-cells/${jobId}`,{method:"DELETE"}).catch(()=>{});reject(new DOMException("Aborted","AbortError"));});});}
    es.onmessage=(e)=>{
      try{
        const evt=JSON.parse(e.data);
        if(evt.type==="error"){finish(()=>reject(new Error(evt.data?.message||"Claude CLI error")));}
        else if(evt.type==="done"){
          fetch(`http://localhost:5175/api/complete-cells/${jobId}/result`).then(r=>r.json()).then(result=>{
            if(result.status==="done"&&result.cells&&result.cells.length>0){finish(()=>resolve(result.cells[0].text));}
            else{finish(()=>reject(new Error(result.message||"No cell returned")));}
          }).catch(err=>finish(()=>reject(err)));
        }
      }catch{}
    };
    es.onerror=()=>{/* auto-reconnect; final state arrives via /result or error event */};
  });
}

// AI API call - supports Anthropic, Google Gemini, and Claude CLI providers
async function callAIRaw(day,field,pd,course,editInstruction=null,signal=null){
  const provider=_settings.aiProvider||"gemini";
  // Claude CLI branch — routes through local backup server, uses lesson-plan-completer skill
  if(provider==="cli"){
    const currentText=pd[day]?.[field]||"";
    // Build a minimal plan shape the skill understands
    const planForSkill={id:"inline",name:"Editing Session",course,weekStart:"",term:"",termWeek:"",completed:false,planData:pd};
    try{return await callCliForCell(day,field,currentText,editInstruction,planForSkill,signal);}
    catch(e){if(e.name==='AbortError')return null;console.error('CLI call failed:',e);throw e;}
  }
  if(!_settings.apiKey){console.log('AI call attempted for',day,field,'- requires API key');return null;}
  const topic=pd[day]?.lessonTitle||"";
  const promptFn=AI_FIELD_PROMPTS[field];
  if(!promptFn&&!editInstruction){console.log('No prompt template for field:',field);return null;}
  const userMsg=editInstruction||promptFn(course,topic);
  const weekCtx=DAYS.map(d=>{const dp=pd[d]||emptyDay();if(dp.canceled)return `${d}: CANCELED${dp.canceled.reason?` (${dp.canceled.reason})`:""}`;const parts=[`topic="${dp.lessonTitle||""}"`,dp.keyVocab&&`vocab="${dp.keyVocab}"`,dp.objectives&&`objectives="${dp.objectives}"`,dp.essentialQs&&`essentialQs="${dp.essentialQs}"`,dp.bellWorkType&&`bellWork="${dp.bellWorkType}${dp.bellWorkText?": "+dp.bellWorkText:""}"`,dp.anticipatorySelected?.length&&`anticipatorySet="${dp.anticipatorySelected.join(", ")}${dp.anticipatoryText?" - "+dp.anticipatoryText:""}"`,dp.guidedPracticeType&&`guidedPractice="${dp.guidedPracticeType}${dp.guidedPracticeText?" - "+dp.guidedPracticeText:""}"`,dp.indPracticeType&&`independentPractice="${dp.indPracticeType}${dp.indPracticeText?" - "+dp.indPracticeText:""}"`,dp.smps&&`smps="${dp.smps}"`,dp.msccrs&&`msccrs="${dp.msccrs}"`].filter(Boolean);return `${d}: ${parts.join(", ")}`;}).join("\n");
  const fullUserMsg=`WEEK CONTEXT:\n${weekCtx}\n\nCOURSE: ${course}\nDAY: ${day}\nFIELD: ${field}\n\n${userMsg}`;
  try{
    if(provider==="gemini"){
      const modelMap={"gemini-flash":"gemini-2.0-flash","gemini-pro":"gemini-2.0-flash-thinking-exp"};
      const model=modelMap[_settings.aiModel]||"gemini-2.0-flash";
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${_settings.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:getSystemPrompt()}]},contents:[{role:"user",parts:[{text:fullUserMsg}]}],generationConfig:{maxOutputTokens:1024}}),signal});
      if(!res.ok){const err=await res.text();console.error('AI API error:',err);let msg='API request failed';try{const parsed=JSON.parse(err);msg=parsed.error?.message||msg;}catch(_){}throw new Error(msg);}
      const data=await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text||null;
    }else{
      // Both "AI Model" settings resolve to Claude Opus 5. The previous IDs
      // (claude-opus-4-20250514 / claude-sonnet-4-20250514) are retired and 404.
      const model="claude-opus-5";
      // Opus 5 thinks by default, and max_tokens caps thinking + text together —
      // 1024 truncated these before the answer arrived. "low" effort suits these
      // short, single-field generations.
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":_settings.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model,max_tokens:4096,output_config:{effort:"low"},system:getSystemPrompt(),messages:[{role:"user",content:fullUserMsg}]}),signal});
      if(!res.ok){const err=await res.text();console.error('AI API error:',err);let msg='API request failed';try{msg=JSON.parse(err).error?.message||msg;}catch(_){}throw new Error(msg);}
      const data=await res.json();
      // Find the text block — content[0] is a thinking block on thinking-enabled models.
      return (data.content||[]).find(b=>b.type==="text")?.text||null;
    }
  }catch(e){if(e.name==='AbortError')return null;console.error('AI call failed:',e);throw e;}
}

function buildPrintHtml(pd,course,weekStart,termWeek){
  const wDates=getWeekDates(weekStart);const nl=v=>(v||"").replace(/\n/g,"<br>");
  const PDF_COL={Monday:"#eaf6fd",Tuesday:"#fff1eb",Wednesday:"#f4fde3",Thursday:"#ffedf3",Friday:"#ffffe8"};
  const PDF_HDR={Monday:"#87ceeb",Tuesday:"#ffa07a",Wednesday:"#bce861",Thursday:"#fe86ab",Friday:"#fff231"};
  const PDF_BDR={Monday:"#5aaedc",Tuesday:"#e07050",Wednesday:"#8ec430",Thursday:"#e05080",Friday:"#c8c000"};
  const PDF_TXT={Monday:"#1a3a5c",Tuesday:"#7a2a10",Wednesday:"#3a5a00",Thursday:"#7a1040",Friday:"#6a6000"};
  const navy="#2d4a6e",teal="#0d9488";
  const md=t=>mdToHtml(nl(t||""));
  const cellVal=(day,field)=>{const p=pd[day]||emptyDay();if(p.canceled){return field==="lessonTitle"?`<div style="text-align:center;padding:20px 8px;"><div style="font-size:22pt;margin-bottom:8px;">&#128683;</div><div style="font-weight:bold;font-size:13pt;color:#92400e;">No Classes</div>${p.canceled.reason&&p.canceled.reason!=="No Classes"?`<div style="font-size:11pt;color:#b45309;font-style:italic;margin-top:6px;">${p.canceled.reason}</div>`:""}</div>`:null;}switch(field){
    case "lessonTitle":return `<strong style="color:#0a0a0a">${nl(p.lessonTitle)||"&nbsp;"}</strong>`;
    case "centralFocus":return md(p.centralFocus)||"&nbsp;";
    case "priorKnowledge":return md(p.priorKnowledge)||"&nbsp;";
    case "keyVocab":return md(p.keyVocab)||"&nbsp;";
    case "objectives":return md(p.objectives)||"&nbsp;";
    case "essentialQs":return md(p.essentialQs)||"&nbsp;";
    // Dropdown selections ("Group Jam", "Error Analysis", …) are deliberately omitted — this
    // PDF prints only the text written in each cell. Rows where the selection IS the content
    // (Accommodations, Homework) are unaffected. A cell with a selection but no text prints
    // blank rather than printing the selection name.
    case "bellWork":return md(p.bellWorkText)||"&nbsp;";
    case "anticipatorySet":return md(p.anticipatoryText)||"&nbsp;";
    case "guidedPractice":return md(p.guidedPracticeText)||"&nbsp;";
    case "independentPractice":return md(p.indPracticeText)||"&nbsp;";
    case "lesson":return md(p.lesson)||"&nbsp;";
    case "conclusion":return md(p.conclusionText)||"&nbsp;";
    case "accommodations":{const acc=ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label).join(" · ");return acc||"&nbsp;";}
    case "assessment":{const a=p.assessment||{};const form=(a.form||[]).join(", ");const summ=a.quizName?`${a.quizName}${a.quizDate?` (${a.quizDate})`:""}`:"";return `${form?`<span class="lbl">Formative:</span> ${form}`:""}${form&&summ?"<br>":""}${summ?`<span class="lbl">Summative:</span> ${summ}`:""}` ||"&nbsp;";}
    case "hmw":{const h=(p.hmwSelected||["None"]).join(", ");return h+(p.hmwText?`<br>${nl(p.hmwText)}`:"");}
    case "smps":return md(p.smps)||"&nbsp;";
    case "msccrs":return md(p.msccrs)||"&nbsp;";
    case "weeklyObjectives":return md(p.weeklyObjectives)||"&nbsp;";
    // Mirrors the fused row in the Edit Lesson Plan tab: standard code first, objectives
    // under it. Stored as two fields, so they are combined here rather than in the data.
    case "msccrsObjectives":{
      const parts=[p.msccrs&&md(p.msccrs),p.objectives&&md(p.objectives)].filter(Boolean);
      return parts.length?parts.join("<br>"):"&nbsp;";
    }
    case "helpfulLinks":{
      const links=(Array.isArray(p.helpfulLinks)?p.helpfulLinks:[]).map(u=>String(u).trim()).filter(Boolean);
      return links.length?links.map(u=>escapeHtml(u)).join("<br>"):"&nbsp;";
    }
    default:return "&nbsp;";
  }};
  // Rows for the Edit Lesson Plan tab's Print Preview / Export PDF. Deliberately narrower
  // than the data model: Key Vocabulary, Essential Questions, Central Focus, Prior
  // Knowledge, SMPs, Assessment, Homework and Weekly Objectives are all omitted.
  const rows=[
    {key:"lessonTitle",label:"Lesson Topic"},
    {key:"msccrsObjectives",label:"MSCCRS & Learning Objectives"},
    {key:"bellWork",label:"Bell Work"},
    {key:"anticipatorySet",label:"Anticipatory Set"},
    {key:"lesson",label:"Lesson"},
    {key:"guidedPractice",label:"Guided Practice"},
    {key:"independentPractice",label:"Independent Practice"},
    {key:"conclusion",label:"Exit Ticket & Conclusion"},
    {key:"accommodations",label:"Accommodations"},
    {key:"helpfulLinks",label:"Helpful Links"},
  ];
  const dayHeaders=DAYS.map(d=>{
    const c=pd[d]?.canceled;
    return `<th style="background:${c?"#e5e7eb":PDF_HDR[d]};color:${c?"#6b7280":PDF_TXT[d]};padding:10px 8px;text-align:center;border:2px solid ${c?"#9ca3af":PDF_BDR[d]};font-size:16px;">${d}<br><span style="font-size:14px;opacity:0.8">${formatDate(wDates[DAYS.indexOf(d)])}</span></th>`;
  }).join("");
  const bodyRows=rows.map(({key,label,full})=>{
    if(full){
      const val=cellVal("Monday",key);
      if(!val||val==="&nbsp;")return "";
      return `<tr><td style="background:#2a2a2a;color:#f0f0f0;padding:8px;font-weight:bold;font-size:15px;text-align:center;border:1px solid #222;width:120px;">${label}</td><td colspan="5" style="background:#fff;border:1px solid #d1d5db;padding:8px;font-size:14px;vertical-align:top;">${val}</td></tr>`;
    }
    const cells=DAYS.map(d=>{
      const c=pd[d]?.canceled;const val=cellVal(d,key);
      if(c&&key!=="lessonTitle")return `<td style="background:#f9fafb;border:1px dashed #d1d5db;padding:8px;color:#9ca3af;text-align:center;font-style:italic;">\u2014</td>`;
      return `<td style="background:${PDF_COL[d]};border:1px solid ${PDF_BDR[d]};padding:8px;font-size:14px;vertical-align:top;">${val||"&nbsp;"}</td>`;
    }).join("");
    return `<tr><td style="background:#2a2a2a;color:#f0f0f0;padding:8px;font-weight:bold;font-size:15px;text-align:center;border:1px solid #222;width:120px;">${label}</td>${cells}</tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${course}</title><style>body{font-family:Tahoma,sans-serif;margin:20px;color:#1e2a3a;}table{border-collapse:collapse;width:100%;table-layout:fixed;}.lbl{font-weight:bold;color:${navy};}h1{color:${navy};font-size:20px;margin-bottom:4px;}h2{color:${teal};font-size:16px;font-weight:normal;margin-top:0;}@media print{body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style></head><body><h1>${course}</h1><h2>${termWeek||""} \u2014 ${formatDate(wDates[0])} \u2013 ${formatDate(wDates[4])}</h2><table><thead><tr><th style="background:#1a1a1a;color:#f0f0f0;padding:10px 8px;width:120px;">${termWeek||"Week"}</th>${dayHeaders}</tr></thead><tbody>${bodyRows}</tbody></table><div style="text-align:center;margin-top:16px;color:#9ca3af;font-size:13px;">Dr. Derrick DeMars \u2014 Innova Preparatory School</div></body></html>`;
}
function escapeHtml(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\n/g,"<br>");}
const DV_HIGHLIGHT_COLORS=[{name:"Yellow",c:"#fef08a"},{name:"Green",c:"#bbf7d0"},{name:"Blue",c:"#bfdbfe"},{name:"Pink",c:"#fbcfe8"},{name:"Orange",c:"#fed7aa"},{name:"Remove",c:"transparent"}];
// opts.rows limits which rows appear (defaults to the full Daily View set) and opts.courses
// limits which classes are included — the Individual PDF export uses both to emit one class
// at a time with a reduced row set.
function buildDailyPrintHtml(day,plans,weekStart,settings,opts={}){
  const CC={"Geometry":"#9333ea","Algebra III":"#ca8a04","Algebra I":"#2563eb","Algebra II":"#dc2626","8th Grade Math":"#16a34a","7th Grade Math":"#0891b2"};
  const dayIdx=DAYS.indexOf(day);const dayDate=new Date(weekStart);dayDate.setDate(weekStart.getDate()+dayIdx+1);
  const displayDate=`${dayDate.getDate()} ${dayDate.toLocaleDateString("en-US",{month:"short"}).replace(".","").slice(0,3)} ${String(dayDate.getFullYear()).slice(-2)}`;
  const nl=v=>(v||"").replace(/\n/g,"<br>");
  const planByCourse={};plans.forEach(p=>{planByCourse[p.course]=p;});
  const rows=opts.rows||DAILY_VIEW_ROWS;
  const courseList=opts.courses||DAILY_ORDER;
  const textOnly=!!opts.textOnly;
  const courseBlocks=courseList.map((course,ci)=>{
    const plan=planByCourse[course];const color=CC[course]||"#6b7280";
    // Every class starts its own page. `page-break-inside:avoid` is deliberately not used:
    // a class whose content runs past one page must be allowed to flow onto the next.
    const pb=ci>0?"page-break-before:always;break-before:page;":"";
    const dd=plan?.planData?.[day];const isCanceled=dd?.canceled!=null;
    if(!plan)return `<div class="pdf-page-block" style="border-left:5px solid ${color};border:1px solid #e5e7eb;border-left:5px solid ${color};border-radius:8px;padding:16px 20px;margin-bottom:20px;${pb}"><div style="display:inline-block;background:${color};color:#fff;border-radius:4px;padding:3px 10px;font-size:15px;font-weight:bold;margin-bottom:8px;">${course}</div><div style="padding:16px;text-align:center;color:#9ca3af;font-size:14px;">No lesson plan created for this week.</div></div>`;
    if(isCanceled)return `<div class="pdf-page-block" style="border:1px solid #e5e7eb;border-left:5px solid ${color};border-radius:8px;padding:16px 20px;margin-bottom:20px;${pb}"><div style="display:inline-block;background:${color};color:#fff;border-radius:4px;padding:3px 10px;font-size:15px;font-weight:bold;margin-bottom:8px;">${course}</div><span style="background:#fef2f2;color:#dc2626;border-radius:4px;padding:3px 8px;font-size:12px;font-weight:bold;margin-left:8px;border:1px solid #fca5a5;">\u274c ${dd.canceled.reason||"Canceled"}</span><div style="padding:16px;text-align:center;color:#9ca3af;font-size:14px;">No classes \u2014 ${dd.canceled.reason||"Canceled"}${dd.canceled.isHoliday?" (School Holiday)":""}</div></div>`;
    const md2=t=>mdToHtml(nl(t||""));
    const getVal=(key,composite)=>{
      if(!dd)return"";
      if(composite){
        // Each composite row is a dropdown selection plus its field text. `opts.textOnly`
        // (used by the per-class Individual PDF) drops the selection and prints only the
        // text. When a selection exists but the text is empty the row still shows the
        // selection in normal mode, and falls back to the text alone when there is no
        // selection — matching how the Daily View tab renders these.
        const PARTS={
          bellWork:d=>[d.bellWorkType,d.bellWorkText],
          anticipatorySet:d=>[(d.anticipatorySelected||[]).join(", "),d.anticipatoryText],
          lesson:d=>[d.lessonType,d.lesson],
          guidedPractice:d=>[d.guidedPracticeType?`${d.guidedPracticeType}${d.guidedPracticeLabel?`: ${d.guidedPracticeLabel}`:""}`:"",d.guidedPracticeText],
          independentPractice:d=>[d.indPracticeType,d.indPracticeText],
          conclusion:d=>[d.conclusionType,d.conclusionText],
        };
        if(PARTS[key]){
          const [tp,tx]=PARTS[key](dd);
          if(textOnly)return tx?md2(tx):"";
          return tp?`<strong>${tp}</strong>${tx?`<br>${md2(tx)}`:""}`:(tx?md2(tx):"");
        }
        if(key==="hmw"){const h=(dd.hmwSelected||["None"]).join(", ");const tx=dd.hmwText||"";return h+(tx?"<br>"+nl(tx):"");}
        if(key==="assessment"){const a=dd.assessment||{};const form=(a.form||[]).concat(a.formOthers||[]).join(", ");const summ=a.quizName?(a.quizName+(a.quizDate?" ("+a.quizDate+")":"")):"";return form?(form+(summ?"<br><strong>Summative:</strong> "+summ:"")):(summ?"<strong>Summative:</strong> "+summ:"");}
        if(key==="accommodations"){const a=dd.accommodations||{};const picked=[...ACCOMMODATIONS.filter(x=>a[x.key]).map(x=>x.label),...(a.accOthers||[])];return picked.length?escapeHtml(picked.join("; ")):"";}
      }
      return md2(dd[key])||"";
    };
    const rowsHtml=rows.map(({key,label,composite})=>{
      const val=getVal(key,composite);
      // Empty rows are hidden here exactly as they are in the tab, rather than printing a
      // placeholder dash, so the PDF shows the same rows the screen does.
      if(!val)return"";
      return `<tr><td style="padding:6px 10px;font-weight:bold;color:#5a6a80;vertical-align:top;width:180px;border-bottom:1px solid #e5e7eb;font-size:18px;">${escapeHtml(label)}</td><td style="padding:6px 10px;color:#1e2a3a;border-bottom:1px solid #e5e7eb;line-height:1.5;${key==="lessonTitle"?"font-weight:bold;":""}"><div>${val}</div></td></tr>`;
    }).filter(Boolean).join("");
    return `<div class="pdf-page-block" style="border:1px solid #e5e7eb;border-left:5px solid ${color};border-radius:8px;padding:16px 20px;margin-bottom:20px;${pb}"><div style="display:inline-block;background:${color};color:#fff;border-radius:4px;padding:3px 10px;font-size:15px;font-weight:bold;margin-bottom:10px;">${course}</div><table style="width:100%;border-collapse:collapse;">${rowsHtml}</table></div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily View \u2014 ${day}</title><style>body{font-family:Tahoma,sans-serif;margin:20px;color:#1e2a3a;}@page{@top-right{content:"${displayDate}";font-size:11px;color:#666;}}@media print{body{margin:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body><div style="text-align:right;margin-bottom:12px;font-size:13px;color:#666;">${displayDate}</div>${courseBlocks}</body></html>`;
}
function printFromHtml(html){
  let frame=document.getElementById("print-frame");
  if(!frame){frame=document.createElement("iframe");frame.id="print-frame";frame.style.cssText="position:fixed;width:0;height:0;border:none;left:-9999px;";document.body.appendChild(frame);}
  const fd=frame.contentDocument||frame.contentWindow.document;
  fd.open();fd.write(html);fd.close();
  setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();},400);
}
async function exportPdfFromHtml(html,filename="lesson-plan.pdf",opts={}){
  const orientation=opts.orientation||"portrait";
  const letterW=215.9,letterH=279.4;
  const pageW=orientation==="landscape"?letterH:letterW;
  const pageH=orientation==="landscape"?letterW:letterH;
  const margin=opts.margin||10;
  const contentW=pageW-margin*2;
  const renderW=opts.renderWidth||1100;
  const container=document.createElement("div");
  container.style.cssText=`position:fixed;left:-9999px;top:0;width:${renderW}px;background:#fff;`;
  document.body.appendChild(container);
  container.innerHTML=html.replace(/^<!DOCTYPE[^>]*>.*?<body[^>]*>/is,"").replace(/<\/body>.*$/is,"");
  const styleMatch=html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if(styleMatch){const s=document.createElement("style");s.textContent=styleMatch[1];container.prepend(s);}
  await new Promise(r=>setTimeout(r,300));
  // Record where each row ends (CSS px, relative to the container) BEFORE rasterising, so
  // page breaks can be pulled back to a row boundary instead of slicing through a line of
  // text. Without this the split is purely geometric and lands mid-sentence.
  let rowEnds=null;
  if(opts.rowSelector){
    const top=container.getBoundingClientRect().top;
    rowEnds=[...container.querySelectorAll(opts.rowSelector)]
      .map(el=>el.getBoundingClientRect().bottom-top)
      .filter(v=>v>0).sort((a,b)=>a-b);
  }
  const cssHeight=container.scrollHeight;
  const canvas=await html2canvas(container,{scale:opts.scale||2,useCORS:true,backgroundColor:"#ffffff"});
  document.body.removeChild(container);
  const cssToCanvas=cssHeight>0?canvas.height/cssHeight:1;
  const scale=contentW/canvas.width;
  const imgWMm=canvas.width*scale;const imgHMm=canvas.height*scale;
  const usableH=pageH-margin*2;
  const pdf=new jsPDF({orientation,unit:"mm",format:"letter"});
  const maxSlice=usableH/scale;
  let srcY=0,page=0;
  while(srcY<canvas.height-1){
    if(page>0)pdf.addPage("letter",orientation);
    let sliceH=Math.min(maxSlice,canvas.height-srcY);
    // Pull the cut back to the last row boundary that still fits. Skipped when a single row
    // is taller than a page, where a hard cut is the only option.
    if(rowEnds&&sliceH<canvas.height-srcY){
      const limit=srcY+sliceH;
      const cut=rowEnds.map(b=>b*cssToCanvas).filter(b=>b>srcY+20&&b<=limit).pop();
      if(cut)sliceH=cut-srcY;
    }
    if(sliceH<=0)break;
    const sliceCanvas=document.createElement("canvas");
    sliceCanvas.width=canvas.width;sliceCanvas.height=Math.ceil(sliceH);
    sliceCanvas.getContext("2d").drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
    // JPEG rather than PNG: a PNG of these full-page rasters ran to tens of MB per export.
    pdf.addImage(sliceCanvas.toDataURL("image/jpeg",opts.quality||0.92),"JPEG",margin,margin,imgWMm,sliceH*scale);
    srcY+=sliceH;page++;
  }
  if(opts.header||opts.footer){
    const total=pdf.internal.getNumberOfPages();
    pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor(102,102,102);
    for(let i=1;i<=total;i++){
      pdf.setPage(i);
      if(opts.header)pdf.text(String(opts.header),pageW-margin,7,{align:"right"});
      if(opts.footer)pdf.text(String(opts.footer),pageW/2,pageH-5,{align:"center"});
    }
  }
  if(opts.returnBlob)return pdf.output("blob");
  pdf.save(filename);
}
// Per-block PDF export. exportPdfFromHtml rasterises the whole document into one tall
// canvas and slices it geometrically, which ignores CSS page breaks and lets a page split
// mid-section. This renders each element matching `blockSelector` on its own page instead,
// so a section can never share a page with another. A block taller than one page still
// flows onto continuation pages rather than being clipped.
async function exportPdfFromBlocks(html,filename="export.pdf",opts={}){
  const blockSelector=opts.blockSelector||".pdf-page-block";
  const orientation=opts.orientation||"portrait";
  const letterW=215.9,letterH=279.4;
  const pageW=orientation==="landscape"?letterH:letterW;
  const pageH=orientation==="landscape"?letterW:letterH;
  const margin=opts.margin||10;
  const contentW=pageW-margin*2;
  const usableH=pageH-margin*2;
  const renderW=opts.renderWidth||1100;

  const container=document.createElement("div");
  container.style.cssText=`position:fixed;left:-9999px;top:0;width:${renderW}px;background:#fff;`;
  document.body.appendChild(container);
  container.innerHTML=html.replace(/^<!DOCTYPE[^>]*>.*?<body[^>]*>/is,"").replace(/<\/body>.*$/is,"");
  const styleMatch=html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if(styleMatch){const s=document.createElement("style");s.textContent=styleMatch[1];container.prepend(s);}
  await new Promise(r=>setTimeout(r,300));

  const blocks=[...container.querySelectorAll(blockSelector)];
  if(!blocks.length){document.body.removeChild(container);return exportPdfFromHtml(html,filename,opts);}

  const pdf=new jsPDF({orientation,unit:"mm",format:"letter"});
  let firstPage=true;
  for(const el of blocks){
    const canvas=await html2canvas(el,{scale:opts.scale||2,useCORS:true,backgroundColor:"#ffffff"});
    const mmPerPx=contentW/canvas.width;
    const fullHMm=canvas.height*mmPerPx;
    let srcY=0;
    while(srcY<canvas.height){
      if(!firstPage)pdf.addPage("letter",orientation);
      firstPage=false;
      const sliceH=Math.min(usableH/mmPerPx,canvas.height-srcY);
      const slice=document.createElement("canvas");
      slice.width=canvas.width;slice.height=Math.ceil(sliceH);
      slice.getContext("2d").drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
      // JPEG keeps a multi-page daily export to a few MB; PNG of this many full pages ran to
      // well over 100MB and made the file unusable.
      pdf.addImage(slice.toDataURL("image/jpeg",opts.quality||0.92),"JPEG",margin,margin,contentW,sliceH*mmPerPx);
      srcY+=sliceH;
      if(fullHMm<=usableH)break;
    }
  }
  document.body.removeChild(container);
  // Header and footer are drawn per page with jsPDF rather than placed in the HTML: only
  // the blocks get rasterised, so anything in the surrounding markup would never reach the
  // PDF, and drawing them here also keeps them as real 10pt text instead of pixels.
  if(opts.header||opts.footer){
    const total=pdf.internal.getNumberOfPages();
    pdf.setFont("helvetica","normal");
    pdf.setFontSize(10);
    pdf.setTextColor(102,102,102);
    for(let i=1;i<=total;i++){
      pdf.setPage(i);
      if(opts.header)pdf.text(String(opts.header),pageW-margin,7,{align:"right"});
      if(opts.footer)pdf.text(String(opts.footer),pageW/2,pageH-5,{align:"center"});
    }
  }
  // Callers that bundle several PDFs (the Individual PDF zip) want the bytes, not a download.
  if(opts.returnBlob)return pdf.output("blob");
  pdf.save(filename);
}
// Minimal store-only ZIP writer. PDF bytes are already deflate-compressed internally, so
// re-compressing buys almost nothing, and storing them keeps this dependency-free — npm
// installs into the Google Drive copy of this project are unreliable, so adding jszip would
// have made the Drive copy unrunnable.
function crc32(buf){
  let crc=-1;
  for(let i=0;i<buf.length;i++){
    crc=crc^buf[i];
    for(let j=0;j<8;j++)crc=(crc>>>1)^(0xEDB88320&-(crc&1));
  }
  return (crc^-1)>>>0;
}
function makeZipBlob(files){
  const enc=new TextEncoder();
  const parts=[],central=[];
  let offset=0;
  for(const f of files){
    const name=enc.encode(f.name);
    const crc=crc32(f.data),size=f.data.length;
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0,true);
    lh.setUint16(8,0,true);lh.setUint16(10,0,true);lh.setUint16(12,0,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,size,true);lh.setUint32(22,size,true);
    lh.setUint16(26,name.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),name,f.data);
    const cd=new DataView(new ArrayBuffer(46));
    cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);
    cd.setUint16(8,0,true);cd.setUint16(10,0,true);cd.setUint16(12,0,true);cd.setUint16(14,0,true);
    cd.setUint32(16,crc,true);cd.setUint32(20,size,true);cd.setUint32(24,size,true);
    cd.setUint16(28,name.length,true);cd.setUint16(30,0,true);cd.setUint16(32,0,true);
    cd.setUint16(34,0,true);cd.setUint16(36,0,true);cd.setUint32(38,0,true);
    cd.setUint32(42,offset,true);
    central.push(new Uint8Array(cd.buffer),name);
    offset+=30+name.length+size;
  }
  const cdSize=central.reduce((n,c)=>n+c.length,0);
  const eocd=new DataView(new ArrayBuffer(22));
  eocd.setUint32(0,0x06054b50,true);eocd.setUint16(4,0,true);eocd.setUint16(6,0,true);
  eocd.setUint16(8,files.length,true);eocd.setUint16(10,files.length,true);
  eocd.setUint32(12,cdSize,true);eocd.setUint32(16,offset,true);eocd.setUint16(20,0,true);
  return new Blob([...parts,...central,new Uint8Array(eocd.buffer)],{type:"application/zip"});
}
function buildPacingPrintHtml(rows,course,year){
  const headers=["Week","Day/Date","Lesson Topic","Central Focus","Learning Objectives","MSCCRS"];
  const thStyle='padding:6px 8px;text-align:left;background:#1a1a1a;color:#f0f0f0;font-size:12px;border:1px solid #333;';
  const DAY_FULL={Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday"};
  const parseWL=w=>{const m=String(w||"").match(/^(Q\d)\s*[–-]\s*W(\d+)/i);return m?{term:m[1],weekNum:`W${m[2]}`}:{term:"",weekNum:""};};
  const rowsHtml=rows.map((r,idx)=>{
    if(r.mergedHidden)return"";
    const isWeekStart=idx===0||rows[idx-1].week!==r.week;
    const {term,weekNum}=parseWL(r.week);
    const weekCell=isWeekStart&&r.week?`<strong>${term}</strong><br>${weekNum}`:"";
    const dayFull=DAY_FULL[r.day]||r.day||"";
    const dateCell=r.isMergedRange?`<span style="color:#6b7280;">${r.date||""}</span>`:`<strong>${dayFull}</strong><br><span style="color:#6b7280;">${r.date||""}</span>`;
    const isMerged=(r.type==="Break/Holiday"||r.type==="No School"||r.type==="Class Canceled"||r.type==="Field Trip"||r.type==="No Class")&&!r.keepContent;
    const bg=r.type==="Quiz"?"rgba(191,219,254,0.4)":(r.type==="Exam"?"rgba(254,202,202,0.4)":(r.type==="Benchmark"?"rgba(187,247,208,0.4)":(isMerged?"#f3f4f6":"#fff")));
    const isFri=r.day==="Fri";const nextMon=idx+1<rows.length&&rows[idx+1].day==="Mon";
    const bb=(isFri&&nextMon)||isMerged?'border-bottom:2px solid #4b5563;':'border-bottom:1px solid #e5e7eb;';
    const td=`padding:4px 6px;font-size:11px;vertical-align:top;${bb}`;
    if(isMerged){
      const label=r.noClassName||r.breakLabel||r.type;
      return `<tr style="background:${bg};"><td style="${td}">${weekCell}</td><td style="${td}">${dateCell}</td><td colspan="4" style="${td}text-align:center;font-weight:bold;font-size:12px;">${label}</td></tr>`;
    }
    return `<tr style="background:${bg};"><td style="${td}">${weekCell}</td><td style="${td}">${dateCell}</td><td style="${td}">${r.lessonTopic||""}</td><td style="${td}">${r.centralFocus||""}</td><td style="${td}">${r.learningObjectives||""}</td><td style="${td}">${r.standards||""}</td></tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pacing Guide — ${course}</title><style>body{font-family:Tahoma,sans-serif;margin:16px;color:#1e2a3a;}table{border-collapse:collapse;width:100%;table-layout:fixed;}@media print{body{margin:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body><h2 style="margin:0 0 4px;font-size:16px;color:#1a1a2e;">${course} — Pacing Guide ${year}</h2><div style="color:#6b7280;font-size:11px;margin-bottom:10px;">Dr. Derrick DeMars — Innova Preparatory School</div><table><thead><tr>${headers.map(h=>`<th style="${thStyle}">${h}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
}

function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[src="${src}"]`)){resolve();return;}const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}

function AIToast({count}){
  const [show,setShow]=useState(false);
  const [wasActive,setWasActive]=useState(false);
  const [angle,setAngle]=useState(0);const rafRef=useRef(null);
  useEffect(()=>{if(count===0)return;let last=null;const tick=ts=>{if(last)setAngle(a=>(a+(ts-last)*0.18)%360);last=ts;rafRef.current=requestAnimationFrame(tick);};rafRef.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(rafRef.current);},[count]);
  useEffect(()=>{if(count>0){setShow(true);setWasActive(true);}else if(wasActive&&count===0){const t=setTimeout(()=>{setShow(false);setWasActive(false);},3000);return()=>clearTimeout(t);}},[count]);
  if(!show)return null;
  const isActive=count>0;const r=14,circ=2*Math.PI*r;
  return(<div style={{position:"absolute",top:10,right:20,zIndex:100,display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:isActive?"#e0f2f1":"#f0fdf4",borderRadius:20,border:`1px solid ${isActive?"#0d9488":"#15803d"}`,boxShadow:"0 2px 8px rgba(0,0,0,0.15)",transition:"opacity 0.5s",animation:!isActive?"fadeOut 0.5s 2.5s forwards":"none"}}><svg width={36} height={36} style={{transform:`rotate(${angle}deg)`}}><circle cx={18} cy={18} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3}/><circle cx={18} cy={18} r={r} fill="none" stroke={isActive?"#0d9488":"#15803d"} strokeWidth={3} strokeDasharray={`${isActive?circ*0.75:circ} ${circ}`} strokeLinecap="round"/></svg><span style={{fontSize:13,fontWeight:"bold",color:isActive?"#0d9488":"#15803d",whiteSpace:"nowrap"}}>{isActive?`Generating... (${count} active)`:"AI Generation Complete"}</span></div>);
}

// Simplified App that shows the main dashboard
export default function App(){
  const [savedPlans,setSavedPlans]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editingId,setEditingId]=useState(null);
  const lastOpenedPlanId=useRef(null);
  const [showCreateModal,setShowCreateModal]=useState(false);
  const [showImportModal,setShowImportModal]=useState(false);
  const [activeTab,setActiveTab]=useState("plans");
  const [undoStack,setUndoStack]=useState([]);
  const [redoStack,setRedoStack]=useState([]);
  const [aiCount,setAiCount]=useState(0);
  const [copyMsg,setCopyMsg]=useState("");
  const [showCancelModal,setShowCancelModal]=useState(false);
  const [cancelModalPlan,setCancelModalPlan]=useState(null);
  const [showEditDetailsModal,setShowEditDetailsModal]=useState(false);
  const [schoolHolidays,setSchoolHolidays]=useState([]);
  const [filterCourse,setFilterCourse]=useState("all");
  const [filterTerm,setFilterTerm]=useState("all");
  const [searchQuery,setSearchQuery]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [newHolidayDate,setNewHolidayDate]=useState("");
  const [newHolidayLabel,setNewHolidayLabel]=useState("");
  const [holidayLabels,setHolidayLabels]=useState({});
  const [editingDetailsPlan,setEditingDetailsPlan]=useState(null);
  const [showResetModal,setShowResetModal]=useState(null);
  const [printPreviewHtml,setPrintPreviewHtml]=useState(null);
  const [appModal,setAppModal]=useState(null);
  const [selectedPlanIds,setSelectedPlanIds]=useState(new Set());
  const [prevTab,setPrevTab]=useState("plans");
  const [collapsedRows,setCollapsedRows]=useState(new Set());
  const [bridgeImportDismissed,setBridgeImportDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem("bridgeImportDismissed"))||false;}catch{return false;}});
  const [showBridgeImportBanner,setShowBridgeImportBanner]=useState(false);
  const [bridgeNewHolidays,setBridgeNewHolidays]=useState([]);
  const editLeftAtRef=useRef(null);
  const [editorToolsExpanded,setEditorToolsExpanded]=useState(false);
  const hoverTimerRef=useRef(null);
  const collapseTimerRef=useRef(null);
  const [ptTooltip,setPtTooltip]=useState(null);
  const [gapDetailPlan,setGapDetailPlan]=useState(null);
  const ptTooltipTimer=useRef(null);
  const ptScrollRef=useRef(null);
  const [ptScrollInfo,setPtScrollInfo]=useState({left:0,width:0,trackW:0,show:false});
  const [editorSearch,setEditorSearch]=useState("");
  const [editorSearchMatches,setEditorSearchMatches]=useState([]);
  const [editorSearchIdx,setEditorSearchIdx]=useState(0);
  const activeMatchRef=useRef(null);
  const PACING_YEAR_COURSES={"2025-2026":["6th Grade Math","7th/8th Grade Math","Algebra I","Algebra II","Geometry","Essentials"],"2026-2027":["7th Grade Math","8th Grade Math","Algebra I","Algebra II","Geometry","Algebra III"]};
  const [pacingHistoryYear,setPacingHistoryYear]=useState(()=>{const d=new Date();const y=d.getFullYear();const m=d.getMonth();return m>=6?`${y}-${y+1}`:`${y-1}-${y}`;});
  const [pacingGuideYear,setPacingGuideYear]=useState(()=>{const d=new Date();const y=d.getFullYear();const m=d.getMonth();return m>=6?`${y}-${y+1}`:`${y-1}-${y}`;});
  const [pacingCourseByYear,setPacingCourseByYear]=useState(()=>{const init={};Object.keys(PACING_YEAR_COURSES).forEach(y=>{init[y]=PACING_YEAR_COURSES[y][0];});return init;});
  const autoTypeRow=(r)=>{const lt=(r.lessonTopic||"").trim();let type="Instruction";if(/^Quiz\b/i.test(lt))type="Quiz";else if(/^Exam/i.test(lt))type="Exam";else if(/^Review/i.test(lt))type="Review";return{...r,type:r.type||type};};
  const PACING_SEEDS={"2026-2027":{"Geometry":geometryPacing2627.rows.map(autoTypeRow)}};
  const [pacingData,setPacingData]=useState(()=>{try{const raw=localStorage.getItem("pacingGuideData");if(raw){const parsed=JSON.parse(raw);Object.keys(PACING_SEEDS).forEach(y=>{if(!parsed[y])parsed[y]={};Object.keys(PACING_SEEDS[y]).forEach(c=>{if(!parsed[y][c]){parsed[y][c]=PACING_SEEDS[y][c];}else{parsed[y][c]=parsed[y][c].map(r=>({...r,type:r.type||"Instruction"}));}});});return parsed;}}catch(e){}return JSON.parse(JSON.stringify(PACING_SEEDS));});
  useEffect(()=>{try{localStorage.setItem("pacingGuideData",JSON.stringify(pacingData));}catch(e){}},[pacingData]);
  const [pacingSelectedRows,setPacingSelectedRows]=useState(new Set());
  const [pacingRecentlySelected,setPacingRecentlySelected]=useState(new Set());
  const [pacingClipboard,setPacingClipboard]=useState([]);
  const [pacingImportModal,setPacingImportModal]=useState(null);
  const [pacingImportReport,setPacingImportReport]=useState(null);
  const [pacingDragIdx,setPacingDragIdx]=useState(null);
  const [pacingDragOverIdx,setPacingDragOverIdx]=useState(null);
  const [pacingDuplicateMode,setPacingDuplicateMode]=useState(false);
  const [pacingUndoStack,setPacingUndoStack]=useState(()=>{try{return JSON.parse(localStorage.getItem("pacingUndoStack")||"[]");}catch(e){return[];}});
  const [pacingRedoStack,setPacingRedoStack]=useState(()=>{try{return JSON.parse(localStorage.getItem("pacingRedoStack")||"[]");}catch(e){return[];}});
  useEffect(()=>{try{localStorage.setItem("pacingUndoStack",JSON.stringify(pacingUndoStack.slice(-50)));}catch(e){}},[pacingUndoStack]);
  useEffect(()=>{try{localStorage.setItem("pacingRedoStack",JSON.stringify(pacingRedoStack.slice(-50)));}catch(e){}},[pacingRedoStack]);
  const [pacingAutoTagModal,setPacingAutoTagModal]=useState(null);
  const [pacingNoClassModal,setPacingNoClassModal]=useState(null);
  const [pacingMergeModal,setPacingMergeModal]=useState(null);
  const [pacingAddRowModal,setPacingAddRowModal]=useState(null);
  const [pacingDeleteModal,setPacingDeleteModal]=useState(null);
  const [pacingEditModal,setPacingEditModal]=useState(null);
  const [pacingShiftDatesModal,setPacingShiftDatesModal]=useState(null);
  const [pacingSearchOpen,setPacingSearchOpen]=useState(false);
  const [pacingSearchQuery,setPacingSearchQuery]=useState("");
  const [pacingSearchReplace,setPacingSearchReplace]=useState("");
  const [pacingSearchWholeWord,setPacingSearchWholeWord]=useState(false);
  const [pacingSearchCurrentIdx,setPacingSearchCurrentIdx]=useState(0);
  const [pastePacingModal,setPastePacingModal]=useState(null);
  useEffect(()=>{if(!pastePacingModal)return;const t=setTimeout(()=>{const el=document.getElementById("paste-pacing-current");if(el)el.scrollIntoView({block:"center",behavior:"auto"});},50);return()=>clearTimeout(t);},[pastePacingModal?.planId,pastePacingModal?.allRows?.length]);
  const getPacingRows=(year,course)=>{return pacingData[year]?.[course]||[];};
  const setPacingRows=(year,course,rows)=>{setPacingData(prev=>({...prev,[year]:{...(prev[year]||{}),[course]:rows}}));};
  const commitPacingRows=(year,course,prevRows,nextRows)=>{setPacingUndoStack(s=>[...s.slice(-49),{year,course,rows:JSON.parse(JSON.stringify(prevRows))}]);setPacingRedoStack([]);setPacingRows(year,course,nextRows);};
  const [dvSearch,setDvSearch]=useState("");
  const [dvSearchMatches,setDvSearchMatches]=useState([]);
  const [dvSearchIdx,setDvSearchIdx]=useState(0);
  const [dailyViewDay,setDailyViewDay]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);const dow=d.getDay();if(dow>=1&&dow<=5)return DAYS[dow-1];return"Monday";});
  const [dailyViewWeekStart,setDailyViewWeekStart]=useState(()=>getWeekStart(new Date()));
  const [dailyViewTocOpen,setDailyViewTocOpen]=useState(true);
  // Rendering six PDFs through html2canvas takes a few seconds; this disables the button and
  // shows progress so the export cannot be fired twice concurrently.
  const [dvZipBusy,setDvZipBusy]=useState(false);
  const [dvActiveId,setDvActiveId]=useState("");
  const [dvHighlightColor,setDvHighlightColor]=useState("#fef08a");
  const [dvShowPalette,setDvShowPalette]=useState(false);
  const [dvUndoStack,setDvUndoStack]=useState([]);
  const [dvRedoStack,setDvRedoStack]=useState([]);
  const dvToolbarRef=useRef(null);
  const dvTabsBarRef=useRef(null);
  const [dvToolbarBottom,setDvToolbarBottom]=useState(0);
  const [dvTabsBarBottom,setDvTabsBarBottom]=useState(0);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [settingsDirty,setSettingsDirty]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [lastBackupTime,setLastBackupTime]=useState(null);
  const [backupSessionId]=useState(()=>{const d=new Date();return `session-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;});
  useMemo(()=>{
    const src=settings.darkMode?T_DARK:T_LIGHT;Object.assign(T,src);
    Object.assign(DAY_HDR_BG,settings.darkMode?DAY_HDR_BG_DARK:DAY_HDR_BG_LIGHT);
    Object.assign(DAY_COL_BG,settings.darkMode?DAY_COL_BG_DARK:DAY_COL_BG_LIGHT);
    Object.assign(DAY_BORDER,settings.darkMode?DAY_BORDER_DARK:DAY_BORDER_LIGHT);
    if(settings.courseColors)Object.assign(COURSE_COLORS,settings.courseColors);
    _defaultTerm=settings.defaultTerm||"Term I";
    _settings={..._settings,apiKey:settings.apiKey||"",aiProvider:settings.aiProvider||"gemini",aiModel:settings.aiModel||"gemini-flash",teacherName:settings.teacherName||"Dr. Derrick DeMars",schoolName:settings.schoolName||"Innova Preparatory School",location:settings.location||"Hattiesburg, MS"};
    if(settings.heatmapThresholds)_heatThresholds=settings.heatmapThresholds;
  },[settings.darkMode,settings.courseColors,settings.defaultTerm,settings.apiKey,settings.aiProvider,settings.aiModel,settings.teacherName,settings.schoolName,settings.location,settings.heatmapThresholds]);
  const handleToolbarMouseEnter=()=>{clearTimeout(collapseTimerRef.current);hoverTimerRef.current=setTimeout(()=>setEditorToolsExpanded(true),300);};
  const handleToolbarMouseLeave=()=>{clearTimeout(hoverTimerRef.current);collapseTimerRef.current=setTimeout(()=>{setEditorToolsExpanded(false);setEditorSearch("");setEditorSearchMatches([]);setEditorSearchIdx(0);},400);};

  useEffect(()=>{(async()=>{try{const r=await window.storage.get("savedPlans");if(r)setSavedPlans(JSON.parse(r.value));const h=await window.storage.get("schoolHolidays");if(h)setSchoolHolidays(JSON.parse(h.value));try{await window.storage.remove("templates");}catch{}const hl=await window.storage.get("holidayLabels");if(hl)setHolidayLabels(JSON.parse(hl.value));const cg=await window.storage.get("collapsedGroups");if(cg){const parsed=JSON.parse(cg.value);if(parsed.archived===undefined)parsed.archived=true;setCollapsedGroups(parsed);}const as=await window.storage.get("appSettings");if(as)setSettings(s=>({...DEFAULT_SETTINGS,...JSON.parse(as.value)}));const loadedPlans=r?JSON.parse(r.value):[];const now=new Date();now.setHours(0,0,0,0);const curPlan=loadedPlans.find(p=>{const ws=parseLocalDate(p.weekStart);const we=new Date(ws);we.setDate(we.getDate()+4);we.setHours(23,59,59,999);return ws<=now&&now<=we;});if(curPlan){setEditingId(curPlan.id);lastOpenedPlanId.current=curPlan.id;}}catch{}setLoading(false);})();},[]);
  // Load plugin bridge data from backup server (school-calendar import only)
  useEffect(()=>{
    fetch('http://localhost:5175/api/plugin-bridge').then(r=>r.ok?r.json():null).then(data=>{
      if(data&&!data.error){
        if(!bridgeImportDismissed&&data.calendar){
          const allDates=[];
          (data.calendar.non_school_days||[]).forEach(d=>allDates.push(d));
          (data.calendar.breaks||[]).forEach(b=>{const s=new Date(b.start+"T12:00:00");const e=new Date(b.end+"T12:00:00");for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){const iso=d.toISOString().slice(0,10);allDates.push({date:iso,label:b.label});}});
          setBridgeNewHolidays(allDates);setShowBridgeImportBanner(true);
        }
      }
    }).catch(()=>{});
  },[]);

  const origSettingsRef=useRef(null);
  useEffect(()=>{if(origSettingsRef.current===null)origSettingsRef.current=JSON.stringify(settings);},[]);
  useEffect(()=>{if(origSettingsRef.current!==null&&JSON.stringify(settings)!==origSettingsRef.current)setSettingsDirty(true);},[settings]);
  const saveSettings=useCallback(()=>{try{window.storage.set("appSettings",JSON.stringify(settings));origSettingsRef.current=JSON.stringify(settings);setSettingsDirty(false);}catch{}},[settings]);
  const updatePtScroll=useCallback(()=>{const el=ptScrollRef.current;if(!el)return;const{scrollLeft,scrollWidth,clientWidth}=el;if(scrollWidth<=clientWidth){setPtScrollInfo(s=>s.show?{...s,show:false}:s);return;}const trackW=clientWidth-8;const w=Math.max(40,(clientWidth/scrollWidth)*trackW);const maxS=scrollWidth-clientWidth;const maxL=trackW-w;const left=maxS>0?(scrollLeft/maxS)*maxL:0;setPtScrollInfo({left,width:w,trackW,show:true});},[]);
  useEffect(()=>{if(activeTab!=="progress")return;const t=setTimeout(updatePtScroll,100);window.addEventListener("resize",updatePtScroll);return()=>{clearTimeout(t);window.removeEventListener("resize",updatePtScroll);};},[activeTab,savedPlans,updatePtScroll]);

  useEffect(()=>{
    if(activeTab!=="dailyView"||dvSearch.length<3){setDvSearchMatches([]);setDvSearchIdx(0);return;}
    const q=dvSearch.toLowerCase();const matches=[];
    const currentWeekStart=dailyViewWeekStart;
    const plansThisWeek=savedPlans.filter(p=>{const ws=parseLocalDate(p.weekStart);return ws.getTime()===currentWeekStart.getTime()&&!p.archived;});
    const dvSlug=s=>s.replace(/[^a-zA-Z0-9]/g,"_");
    DAILY_ORDER.forEach(course=>{
      const plan=plansThisWeek.find(p=>p.course===course);if(!plan)return;
      const dd=plan.planData?.[dailyViewDay];if(!dd||dd.canceled)return;
      const cSlug=dvSlug(course);
      const fields=["lessonTitle","centralFocus","priorKnowledge","essentialQs","bellWorkType","bellWorkText","anticipatoryText","guidedPracticeType","guidedPracticeText","indPracticeType","indPracticeText","conclusionText","smps","msccrs","keyVocab","objectives"];
      fields.forEach(f=>{const v=dd[f];if(v&&String(v).toLowerCase().includes(q)){matches.push({course,field:f,cellId:`dv-cell-${cSlug}-${f}`});}});
      const sel=dd.anticipatorySelected;if(sel&&sel.join(", ").toLowerCase().includes(q))matches.push({course,field:"anticipatorySelected",cellId:`dv-cell-${cSlug}-anticipatorySet`});
      ["sugDifferentiation","sugPacing","sugEnhancements"].forEach(f=>{const v=dd[f];if(v&&String(v).toLowerCase().includes(q))matches.push({course,field:f,cellId:`dv-cell-${cSlug}-${f}`});});
    });
    setDvSearchMatches(matches);setDvSearchIdx(0);
  },[dvSearch,activeTab,dailyViewDay,dailyViewWeekStart,savedPlans]);

  useEffect(()=>{
    if(dvSearchMatches.length>0&&dvSearchMatches[dvSearchIdx]){
      setTimeout(()=>{
        const cellEl=document.getElementById(dvSearchMatches[dvSearchIdx].cellId);
        if(!cellEl)return;
        const activeSpan=cellEl.querySelector(".dv-hit-active")||cellEl;
        let scrollParent=cellEl.parentElement;while(scrollParent){const s=getComputedStyle(scrollParent);if(s.overflowY==="auto"||s.overflowY==="scroll")break;scrollParent=scrollParent.parentElement;}
        if(!scrollParent)scrollParent=document.documentElement;
        const toolbarH=dvToolbarRef.current?dvToolbarRef.current.offsetHeight:60;
        const elRect=activeSpan.getBoundingClientRect();
        const parentRect=scrollParent.getBoundingClientRect();
        const y=scrollParent.scrollTop+(elRect.top-parentRect.top)-toolbarH-24;
        scrollParent.scrollTo({top:y,behavior:"smooth"});
      },50);
    }
  },[dvSearchIdx,dvSearchMatches,dvSearch]);

  useEffect(()=>{
    if(activeTab!=="dailyView")return;
    let scrollParentRef=null;
    const handler=()=>{
      const items=document.querySelectorAll("[id^='dv-']");
      if(!items.length)return;
      let closest=null;let closestDist=Infinity;
      const sp=scrollParentRef;if(!sp)return;
      const rect=sp.getBoundingClientRect();
      items.forEach(el=>{const r=el.getBoundingClientRect();const dist=Math.abs(r.top-rect.top-60);if(dist<closestDist){closestDist=dist;closest=el.id;}});
      if(closest)setDvActiveId(closest);
    };
    const t=setTimeout(()=>{
      const els=document.querySelectorAll("[id^='dv-']");
      if(!els.length)return;
      let el=els[0]?.parentElement;while(el){const s=getComputedStyle(el);if(s.overflowY==="auto"||s.overflowY==="scroll"){scrollParentRef=el;break;}el=el.parentElement;}
      if(!scrollParentRef)return;
      scrollParentRef.addEventListener("scroll",handler,{passive:true});
      handler();
    },150);
    return()=>{clearTimeout(t);if(scrollParentRef)scrollParentRef.removeEventListener("scroll",handler);};
  },[activeTab,dailyViewDay]);

  useEffect(()=>{
    if(activeTab!=="dailyView")return;
    const measure=()=>{if(dvToolbarRef.current){const r=dvToolbarRef.current.getBoundingClientRect();setDvToolbarBottom(r.bottom);}if(dvTabsBarRef.current){const r=dvTabsBarRef.current.getBoundingClientRect();setDvTabsBarBottom(r.bottom);}};
    const t=setTimeout(measure,50);
    window.addEventListener("resize",measure);
    return()=>{clearTimeout(t);window.removeEventListener("resize",measure);};
  },[activeTab]);

  const doBackup=useCallback(async()=>{
    try{
      const data={plans:savedPlans,settings,schoolHolidays,holidayLabels,pacingGuideData:pacingData,pacingUndoStack,pacingRedoStack,exportDate:new Date().toISOString()};
      const res=await fetch('http://localhost:5175/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:backupSessionId,data,maxBackupsPerSession:settings.maxBackupsPerSession,maxSessions:settings.maxSessions})});
      if(res.ok){const now=new Date();setLastBackupTime(now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));}
    }catch(e){console.log('Backup server not available:',e.message);}
  },[savedPlans,settings,schoolHolidays,holidayLabels,pacingData,pacingUndoStack,pacingRedoStack,backupSessionId]);

  // Scheduled auto-backup on interval
  useEffect(()=>{
    if(!settings.autoBackupEnabled)return;
    const ms=settings.backupInterval*60*1000;
    const timer=setInterval(doBackup,ms);
    return()=>clearInterval(timer);
  },[settings.autoBackupEnabled,settings.backupInterval,doBackup]);

  // Debounced backup-on-save: backs up 30s after any plan data change
  useEffect(()=>{
    if(!settings.autoBackupEnabled||!savedPlans.length)return;
    const timer=setTimeout(()=>{doBackup();},30000);
    return()=>clearTimeout(timer);
  },[savedPlans,schoolHolidays,holidayLabels,pacingData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pacing Guide: Cmd/Ctrl+C and +V copy/paste rows when not editing text
  useEffect(()=>{
    if(activeTab!=="pacing")return;
    const handler=(e)=>{
      const inForm=e.target&&(e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT");
      if(inForm)return;
      const curCourse=pacingCourseByYear[pacingGuideYear];
      const rows=getPacingRows(pacingGuideYear,curCourse);
      const isFind=(e.metaKey||e.ctrlKey)&&(e.key==="f"||e.key==="F");
      const isCopy=(e.metaKey||e.ctrlKey)&&(e.key==="c"||e.key==="C");
      const isPaste=(e.metaKey||e.ctrlKey)&&(e.key==="v"||e.key==="V");
      if(isFind){e.preventDefault();setPacingSearchOpen(true);return;}
      if(e.key==="Escape"&&pacingSearchOpen){setPacingSearchOpen(false);setPacingSearchQuery("");setPacingSearchCurrentIdx(0);return;}
      if(isCopy&&pacingSelectedRows.size>0){
        e.preventDefault();
        const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);
        const snap=sorted.map(i=>({lessonTopic:rows[i].lessonTopic||"",centralFocus:rows[i].centralFocus||"",learningObjectives:rows[i].learningObjectives||"",standards:rows[i].standards||"",type:rows[i].type||"Instruction"}));
        setPacingClipboard(snap);
      }else if(isPaste&&pacingClipboard.length>0&&pacingSelectedRows.size>0){
        e.preventDefault();
        const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);
        if(sorted.length!==pacingClipboard.length){
          setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Paste count mismatch",message:`Clipboard has ${pacingClipboard.length} row(s) but ${sorted.length} row(s) are selected. Select exactly ${pacingClipboard.length} row(s) to paste.`});
          return;
        }
        const next=[...rows];
        sorted.forEach((idx,i)=>{next[idx]={...next[idx],...pacingClipboard[i]};});
        setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);
        setPacingRedoStack([]);
        setPacingRows(pacingGuideYear,curCourse,next);
      }
    };
    document.addEventListener("keydown",handler);
    return()=>document.removeEventListener("keydown",handler);
  },[activeTab,pacingSelectedRows,pacingClipboard,pacingGuideYear,pacingCourseByYear,pacingSearchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist=useCallback(async(plans)=>{try{await window.storage.set("savedPlans",JSON.stringify(plans));}catch{}},[]);
  const persistHolidays=useCallback(async(holidays)=>{try{await window.storage.set("schoolHolidays",JSON.stringify(holidays));}catch{}},[]);
  const persistHolidayLabels=useCallback(async(labels)=>{try{await window.storage.set("holidayLabels",JSON.stringify(labels));}catch{}},[]);

  const importBridgeHolidays=useCallback((holidays)=>{
    const newH=[...schoolHolidays];const newL={...holidayLabels};
    holidays.forEach(h=>{if(!newH.includes(h.date)){newH.push(h.date);newL[h.date]=h.label;}});
    setSchoolHolidays(newH);persistHolidays(newH);
    setHolidayLabels(newL);persistHolidayLabels(newL);
    setShowBridgeImportBanner(false);
  },[schoolHolidays,holidayLabels,persistHolidays,persistHolidayLabels]);

  const sorted=[...savedPlans].sort((a,b)=>{const d=b.weekStart.localeCompare(a.weekStart);return d!==0?d:a.name.localeCompare(b.name);});
  const filtered=sorted.filter(p=>{if(filterCourse!=="all"&&p.course!==filterCourse)return false;if(filterTerm!=="all"&&p.term!==filterTerm)return false;return true;});
  const filteredActive=filtered.filter(p=>!p.archived);
  const filteredArchived=filtered.filter(p=>p.archived===true);

  // Debounced search
  useEffect(()=>{
    if(!searchQuery.trim()){setSearchResults([]);return;}
    const timer=setTimeout(()=>{
      const q=searchQuery.toLowerCase();
      const sf=["lessonTitle","keyVocab","objectives","essentialQs","smps","msccrs","bellWorkText","anticipatoryText","guidedPracticeText","indPracticeText","conclusionText"];
      const fl={lessonTitle:"Lesson Topic",keyVocab:"Key Vocabulary",objectives:"Objectives",essentialQs:"Essential Questions",smps:"SMPs",msccrs:"MSCCRS",bellWorkText:"Bell Work",anticipatoryText:"Anticipatory Set",guidedPracticeText:"Guided Practice",indPracticeText:"Independent Practice",conclusionText:"Conclusion"};
      const results=[];
      savedPlans.forEach(plan=>{
        const matches=[];
        DAYS.forEach(day=>{const p=plan.planData[day]||{};if(p.canceled)return;sf.forEach(f=>{const val=String(p[f]||"");if(val.toLowerCase().includes(q))matches.push({day,field:fl[f]||f,text:val});});});
        if(matches.length>0)results.push({plan,matches});
      });
      setSearchResults(results);
    },300);
    return()=>clearTimeout(timer);
  },[searchQuery,savedPlans]);

  const today=new Date();today.setHours(0,0,0,0);

  const createPlans=({weekISO,termWeek,term,courses})=>{
    const dateStr=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    const termPart=term&&termWeek?`${term} (${termWeek})`:(term||termWeek||"");
    const newPlans=courses.map((course,i)=>{
      const planName=termPart?`${termPart}: ${course}`:course;
      return{id:`${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`,name:planName,course,weekStart:weekISO,termWeek:termWeek||"",term:term||"",completed:false,planData:emptyWeek(),createdAt:dateStr,updatedAt:null};
    });
    const updated=[...newPlans,...savedPlans];setSavedPlans(updated);persist(updated);setShowCreateModal(false);
  };

  const deletePlan=async(id)=>{
    const updated=savedPlans.filter(p=>p.id!==id);
    setSavedPlans(updated);await persist(updated);
    if(editingId===id)setEditingId(null);
  };

  const duplicatePlan=(plan)=>{
    const newPlan={...plan,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:`${plan.name} (Copy)`,planData:JSON.parse(JSON.stringify(plan.planData)),createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),updatedAt:null,completed:false};
    const updated=[newPlan,...savedPlans];setSavedPlans(updated);persist(updated);
  };
  const resetPlan=(id)=>{const updated=savedPlans.map(p=>p.id===id?{...p,planData:emptyWeek(),updatedAt:null}:p);setSavedPlans(updated);persist(updated);};
  const archivePlan=(id)=>{const updated=savedPlans.map(p=>p.id===id?{...p,archived:true}:p);setSavedPlans(updated);persist(updated);if(editingId===id)setEditingId(null);};
  const unarchivePlan=(id)=>{const updated=savedPlans.map(p=>p.id===id?{...p,archived:false}:p);setSavedPlans(updated);persist(updated);};
  const isArchivedPlan=(id)=>savedPlans.find(p=>p.id===id)?.archived===true;
  const hasSelectedArchived=()=>[...selectedPlanIds].some(isArchivedPlan);
  const hasSelectedActive=()=>[...selectedPlanIds].some(id=>!isArchivedPlan(id));

  const defaultCollapsed={past:true,lastWeek:true,currentWeek:false,nextWeek:true,upcoming:true,archived:true};
  const [collapsedGroups,setCollapsedGroups]=useState(defaultCollapsed);
  const groupTimers=useRef({});
  const toggleGroup=(key)=>setCollapsedGroups(prev=>{
    const next={...prev,[key]:!prev[key]};
    if(next[key]!==defaultCollapsed[key]){
      if(groupTimers.current[key])clearTimeout(groupTimers.current[key]);
      groupTimers.current[key]=setTimeout(()=>{setCollapsedGroups(p=>({...p,[key]:defaultCollapsed[key]}));delete groupTimers.current[key];},100000);
    }else{
      if(groupTimers.current[key]){clearTimeout(groupTimers.current[key]);delete groupTimers.current[key];}
    }
    return next;
  });

  const toggleCompleted=useCallback((id)=>{
    setSavedPlans(prev=>{const next=prev.map(p=>p.id===id?{...p,completed:!p.completed}:p);persist(next);return next;});
  },[persist]);

  const editingPlan=editingId?savedPlans.find(p=>p.id===editingId):null;

  // Reset collapsed rows when returning to edit view after 100+ seconds away
  useEffect(()=>{
    if(editingPlan){
      if(editLeftAtRef.current&&(Date.now()-editLeftAtRef.current>=100000)){
        setCollapsedRows(new Set());
      }
      editLeftAtRef.current=null;
    }else{
      if(!editLeftAtRef.current)editLeftAtRef.current=Date.now();
    }
  },[editingPlan]);

  // Editor grid search
  useEffect(()=>{
    if(!editingPlan||editorSearch.length<3){setEditorSearchMatches([]);setEditorSearchIdx(0);return;}
    const q=editorSearch.toLowerCase();const matches=[];
    const textFields=["lessonTitle","keyVocab","objectives","essentialQs","smps","msccrs","bellWorkText","anticipatoryText","guidedPracticeText","indPracticeText","conclusionText"];
    DAYS.forEach(day=>{const p=editingPlan.planData[day];if(!p||p.canceled)return;textFields.forEach(f=>{const val=String(p[f]||"");if(val.toLowerCase().includes(q))matches.push({day,field:f});});});
    setEditorSearchMatches(matches);setEditorSearchIdx(0);
  },[editorSearch,editingPlan]);

  useEffect(()=>{if(activeMatchRef.current)activeMatchRef.current.scrollIntoView({behavior:"smooth",block:"nearest"});},[editorSearchIdx,editorSearchMatches]);

  const handlePlanDataChange=useCallback((id,course)=>updater=>{
    setSavedPlans(prev=>{
      const old=prev.find(p=>p.id===id);
      if(old)setUndoStack(us=>[...us.slice(-49),JSON.parse(JSON.stringify(old.planData))]);
      setRedoStack([]);
      const next=prev.map(p=>{if(p.id!==id)return p;const newPD=typeof updater==="function"?updater(p.planData):updater;return{...p,planData:newPD,course,updatedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})};});persist(next);return next;
    });
  },[persist]);

  const handleUndo=useCallback(()=>{
    if(!editingId||undoStack.length===0)return;
    setSavedPlans(prev=>{const plan=prev.find(p=>p.id===editingId);if(plan)setRedoStack(rs=>[...rs,JSON.parse(JSON.stringify(plan.planData))]);const snapshot=undoStack[undoStack.length-1];setUndoStack(us=>us.slice(0,-1));const next=prev.map(p=>p.id===editingId?{...p,planData:snapshot}:p);persist(next);return next;});
  },[editingId,undoStack,persist]);

  const handleRedo=useCallback(()=>{
    if(!editingId||redoStack.length===0)return;
    setSavedPlans(prev=>{const plan=prev.find(p=>p.id===editingId);if(plan)setUndoStack(us=>[...us,JSON.parse(JSON.stringify(plan.planData))]);const snapshot=redoStack[redoStack.length-1];setRedoStack(rs=>rs.slice(0,-1));const next=prev.map(p=>p.id===editingId?{...p,planData:snapshot}:p);persist(next);return next;});
  },[editingId,redoStack,persist]);

  const navigatePlan=(dir)=>{
    const plan=savedPlans.find(p=>p.id===editingId);if(!plan)return;
    const coursePlans=savedPlans.filter(p=>p.course===plan.course&&!p.archived).sort((a,b)=>a.weekStart.localeCompare(b.weekStart));
    const idx=coursePlans.findIndex(p=>p.id===editingId);
    const ti=idx+dir;
    if(ti>=0&&ti<coursePlans.length){
      const cur=parseLocalDate(coursePlans[idx].weekStart);const tgt=parseLocalDate(coursePlans[ti].weekStart);
      if(Math.abs(Math.round((tgt-cur)/(1000*60*60*24)))===7){setEditingId(coursePlans[ti].id);lastOpenedPlanId.current=coursePlans[ti].id;setUndoStack([]);setRedoStack([]);return;}
    }
    showCourseNavModal(plan.course,coursePlans,idx,dir);
  };

  const createPlanForWeek=(course,wISO)=>{
    if(savedPlans.some(p=>p.weekStart===wISO&&p.course===course&&!p.archived)){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Plan Exists",message:"A plan for this course already exists for that week."});return;}
    const ws=parseLocalDate(wISO);const name=`${course} — Week of ${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;
    const newPlan={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name,course,weekStart:wISO,termWeek:"",term:getDefaultTerm(),completed:false,planData:emptyWeek(),createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),updatedAt:null};
    const updated=[newPlan,...savedPlans];setSavedPlans(updated);persist(updated);
    setAppModal({type:"confirm",icon:"\u2705",title:"Lesson Plan Created",message:`"${name}" has been created. Would you like to switch to the new plan or stay on the current one?`,confirmLabel:"Switch to New Plan",onConfirm:()=>{setEditingId(newPlan.id);lastOpenedPlanId.current=newPlan.id;setUndoStack([]);setRedoStack([]);},onCancel:()=>{}});
  };

  const showCourseNavModal=(course,coursePlans,currentIdx,dir)=>{
    const options=[];
    const now=new Date();now.setHours(0,0,0,0);
    const nws=getWeekStart(new Date(now));nws.setDate(nws.getDate()+7);const nwe=new Date(nws);nwe.setDate(nws.getDate()+6);nwe.setHours(23,59,59,999);
    const getPlanTimeStyle=(ws)=>{const we=new Date(ws);we.setDate(we.getDate()+4);we.setHours(23,59,59,999);const isCur=ws<=now&&now<=we;const isPast=we<now;const isNext=ws>now&&ws<=nwe&&!isCur;if(isCur)return{bg:"#fff7ed",borderLeft:"5px solid #f97316"};if(isPast)return{bg:"#eff6ff",borderLeft:"5px solid #3b82f6"};if(isNext)return{bg:"#faf5ff",borderLeft:"5px solid #7c3aed"};return{bg:"#f0fdf4",borderLeft:"5px solid #16a34a"};};
    // Create Next at top
    const newest=coursePlans[coursePlans.length-1];
    const newestWS=parseLocalDate(newest.weekStart);const nwd=new Date(newestWS);nwd.setDate(nwd.getDate()+7);const nwISO=weekToISO(nwd);
    const nts=getPlanTimeStyle(nwd);
    const curTerm=savedPlans.find(pp=>pp.id===editingId)?.term||"";
    const makeCreateAction=(crs,wISO,wDate)=>()=>{setAppModal({type:"confirm",icon:"\ud83d\udccb",title:"Create New Lesson Plan?",message:`Course: ${crs}\nWeek of: ${wDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}\nTerm: ${curTerm}\n\nThis will create a blank plan.`,confirmLabel:"Create & Open",onConfirm:()=>createPlanForWeek(crs,wISO),onCancel:()=>showCourseNavModal(course,coursePlans,currentIdx,dir)});};
    options.push({label:`+ Create Lesson Plan Here (Week of ${nwd.toLocaleDateString("en-US",{month:"short",day:"numeric"})})`,bg:nts.bg,borderLeft:nts.borderLeft,border:"1px solid #e5e7eb",fontStyle:"italic",opacity:0.5,action:makeCreateAction(course,nwISO,nwd)});
    // Plans newest to oldest with gap buttons
    for(let i=coursePlans.length-1;i>=0;i--){
      const p=coursePlans[i];const ws=parseLocalDate(p.weekStart);
      const isEditing=p.id===editingId;
      const ts=getPlanTimeStyle(ws);
      const curPlanName=savedPlans.find(pp=>pp.id===editingId);const curWS=curPlanName?parseLocalDate(curPlanName.weekStart):null;
      options.push({label:`${isEditing?"\ud83d\udccd":"\ud83d\udccb"} ${p.name} (Week of ${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})})`,bg:ts.bg,border:"1px solid #e5e7eb",borderLeft:ts.borderLeft,isCurrent:isEditing,action:isEditing?()=>{}:()=>{setAppModal({type:"confirm",icon:"\ud83d\udccb",title:"Switch Lesson Plan?",message:`Switch from\n${curPlanName?curPlanName.name:""}\n(Week of ${curWS?curWS.toLocaleDateString("en-US",{month:"short",day:"numeric"}):""})\n\nto\n${p.name}\n(Week of ${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})})`,confirmLabel:"Switch",onConfirm:()=>{setEditingId(p.id);lastOpenedPlanId.current=p.id;setUndoStack([]);setRedoStack([]);},onCancel:()=>showCourseNavModal(course,coursePlans,currentIdx,dir)});}});
      if(i>0){
        const thisWS=parseLocalDate(coursePlans[i].weekStart);const prevWS=parseLocalDate(coursePlans[i-1].weekStart);
        const diffWeeks=Math.round((thisWS-prevWS)/(1000*60*60*24*7));
        for(let w=diffWeeks-1;w>=1;w--){
          const gapDate=new Date(prevWS);gapDate.setDate(gapDate.getDate()+w*7);const gISO=weekToISO(gapDate);
          const gts=getPlanTimeStyle(gapDate);
          options.push({label:`+ Create Lesson Plan Here (Week of ${gapDate.toLocaleDateString("en-US",{month:"short",day:"numeric"})})`,bg:gts.bg,borderLeft:gts.borderLeft,border:"1px solid #e5e7eb",fontStyle:"italic",opacity:0.5,action:makeCreateAction(course,gISO,gapDate)});
        }
      }
    }
    // Create Previous at bottom
    const oldest=coursePlans[0];const oldestWS=parseLocalDate(oldest.weekStart);const pwd=new Date(oldestWS);pwd.setDate(pwd.getDate()-7);const pwISO=weekToISO(pwd);
    const pts=getPlanTimeStyle(pwd);
    options.push({label:`+ Create Lesson Plan Here (Week of ${pwd.toLocaleDateString("en-US",{month:"short",day:"numeric"})})`,bg:pts.bg,borderLeft:pts.borderLeft,border:"1px solid #e5e7eb",fontStyle:"italic",opacity:0.5,action:makeCreateAction(course,pwISO,pwd)});
    const scrollIdx=options.findIndex(o=>o.isCurrent);
    setAppModal({type:"select",icon:"\ud83d\udccb",title:`${course} — All Lesson Plans`,message:dir>0?"No immediate next lesson plan found.":"No immediate previous lesson plan found.",subtitle:"Click a plan to navigate, or create one to fill a gap.",options,compact:true,scrollToIndex:scrollIdx>=0?scrollIdx:undefined});
  };

  const copyToNextWeek=(plan)=>{
    const ws=parseLocalDate(plan.weekStart);ws.setDate(ws.getDate()+7);
    const newWeekISO=weekToISO(ws);
    if(savedPlans.some(p=>p.weekStart===newWeekISO&&p.course===plan.course)){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Duplicate Plan",message:"A plan for this course already exists next week."});return;}
    const twNum=plan.termWeek?parseInt(plan.termWeek.replace(/\D/g,""),10):0;
    const newTermWeek=twNum?`Week ${twNum+1}`:plan.termWeek;
    const termPart=plan.term&&newTermWeek?`${plan.term} (${newTermWeek})`:(plan.term||newTermWeek||"");
    const newName=termPart?`${termPart}: ${plan.course}`:plan.course;
    const newPlan={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:newName,course:plan.course,weekStart:newWeekISO,termWeek:newTermWeek||"",term:plan.term||"",completed:false,planData:emptyWeek(),createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),updatedAt:null};
    const updated=[newPlan,...savedPlans];setSavedPlans(updated);persist(updated);
  };

  const doCarryForward=(plan,nextPlan)=>{
    const src=plan.planData;const tgt=JSON.parse(JSON.stringify(nextPlan.planData));
    const textFields=["lessonTitle","keyVocab","objectives","essentialQs","smps","msccrs","bellWorkText","anticipatoryText","guidedPracticeText","indPracticeText","conclusionText"];
    const selectFields=["bellWorkType","guidedPracticeType","indPracticeType"];
    DAYS.forEach(d=>{
      if(tgt[d]?.canceled||src[d]?.canceled)return;
      textFields.forEach(f=>{if(!tgt[d][f]&&src[d][f])tgt[d][f]=src[d][f];});
      selectFields.forEach(f=>{if(!tgt[d][f]&&src[d][f])tgt[d][f]=src[d][f];});
      if((!tgt[d].anticipatorySelected||tgt[d].anticipatorySelected.length===0)&&src[d].anticipatorySelected?.length>0)tgt[d].anticipatorySelected=[...src[d].anticipatorySelected];
    });
    const updated=savedPlans.map(p=>p.id===nextPlan.id?{...p,planData:tgt,updatedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}:p);
    setSavedPlans(updated);persist(updated);
    setAppModal({type:"alert",icon:"\u2705",title:"Carry Forward Complete",success:"Content carried forward to next week (empty fields only)."});
  };
  const carryForward=(plan)=>{
    const ws=parseLocalDate(plan.weekStart);ws.setDate(ws.getDate()+7);
    const newWeekISO=weekToISO(ws);
    let nextPlan=savedPlans.find(p=>p.weekStart===newWeekISO&&p.course===plan.course);
    if(!nextPlan){
      setAppModal({type:"confirm",icon:"\ud83d\udcc5",title:"Create & Carry Forward",message:`No plan exists for ${plan.course} next week. Create one and carry forward?`,confirmLabel:"Create & Carry Forward",onConfirm:()=>copyToNextWeek(plan)});
      return;
    }
    setAppModal({type:"confirm",icon:"\ud83d\udd04",title:"Carry Forward",message:`Carry forward unfilled content from this week to next week's plan for ${plan.course}? Only empty fields will be filled.`,confirmLabel:"Carry Forward",onConfirm:()=>doCarryForward(plan,nextPlan)});
  };

  const openPastePacingModal=(plan)=>{
    // Resolve the pacing year from the plan's own week (Jul-Dec starts a new school year),
    // then fall back to whichever candidate year actually has rows. Geometry and Algebra I/II
    // appear in more than one year, so a plain first-match lookup silently read the wrong guide.
    const candidates=Object.keys(PACING_YEAR_COURSES).filter(y=>PACING_YEAR_COURSES[y].includes(plan.course));
    let year=candidates.includes(pacingGuideYear)?pacingGuideYear:(candidates[0]||pacingGuideYear);
    if(plan.weekStart){
      const ws0=parseLocalDate(plan.weekStart);
      const startYr=ws0.getMonth()>=6?ws0.getFullYear():ws0.getFullYear()-1;
      const label=`${startYr}-${startYr+1}`;
      if(candidates.includes(label))year=label;
    }
    if(getPacingRows(year,plan.course).length===0){
      const withRows=candidates.find(y=>getPacingRows(y,plan.course).length>0);
      if(withRows)year=withRows;
    }
    const rawRows=getPacingRows(year,plan.course)||[];
    // Filter out merged/no-class rows and rows with no lesson topic
    const allRows=[];
    rawRows.forEach((r,pacingIdx)=>{
      const cfg=PACING_TYPE_CONFIG[r.type||"Instruction"];
      if(r.mergedHidden)return;
      if(cfg&&cfg.merged)return;
      const plainTopic=stripMdFormatting(r.lessonTopic||"").trim();
      if(!plainTopic)return;
      allRows.push({pacingIdx,week:r.week||"",date:r.date||"",day:r.day||"",type:r.type||"Instruction",plainTopic,
        centralFocus:stripMdFormatting(r.centralFocus||"").trim(),
        learningObjectives:stripMdFormatting(r.learningObjectives||"").trim(),
        standards:stripMdFormatting(r.standards||"").trim()});
    });
    // Identify current-week indexes: by termWeek label first, then by Mon-Fri date fallback
    const currentWeekIdxs=[];
    if(plan.termWeek){
      allRows.forEach((r,i)=>{if(r.week===plan.termWeek)currentWeekIdxs.push(i);});
    }
    if(currentWeekIdxs.length===0&&plan.weekStart){
      const ws=parseLocalDate(plan.weekStart);
      const weekDates=new Set();
      for(let i=1;i<=5;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);const fmt=`${d.getDate()} ${d.toLocaleDateString("en-US",{month:"short"}).replace(".","")} ${String(d.getFullYear()).slice(-2)}`;weekDates.add(fmt);}
      allRows.forEach((r,i)=>{if(weekDates.has(r.date))currentWeekIdxs.push(i);});
    }
    // Seed pairings Mon..Fri from current week rows
    const SHORT_TO_LONG={Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday"};
    const pairings={};
    DAYS.forEach(targetDay=>{pairings[targetDay]={enabled:false,sourceIdx:null,overwrite:false};});
    currentWeekIdxs.forEach(i=>{
      const r=allRows[i];
      const longDay=SHORT_TO_LONG[r.day]||null;
      if(longDay&&pairings[longDay]&&pairings[longDay].sourceIdx==null){
        pairings[longDay]={enabled:true,sourceIdx:i,overwrite:false};
      }
    });
    setPastePacingModal({planId:plan.id,course:plan.course,year,termWeek:plan.termWeek||"",allRows,currentWeekIdxs,pairings,selectedSourceIdx:currentWeekIdxs[0]??null});
  };

  const runPastePacing=()=>{
    const m=pastePacingModal;if(!m)return;
    const plan=savedPlans.find(p=>p.id===m.planId);if(!plan)return;
    handlePlanDataChange(plan.id,plan.course)(prev=>{
      const nextPD={...prev};
      DAYS.forEach(day=>{
        const p=m.pairings[day];
        if(!p||!p.enabled||p.sourceIdx==null)return;
        const src=m.allRows[p.sourceIdx];
        if(!src)return;
        const cur=nextPD[day]||emptyDay();
        if((cur.lessonTitle||"").trim()&&!p.overwrite)return;
        const upd={...cur,lessonTitle:src.plainTopic};
        // Carry the pacing row's Central Focus / Learning Objectives / MSCCRS across to the
        // matching lesson-plan fields. Existing content is only replaced when the day is
        // explicitly set to overwrite, so a partially filled day never loses work.
        [["centralFocus",src.centralFocus],["objectives",src.learningObjectives],["msccrs",src.standards]].forEach(([field,val])=>{
          if(!val)return;
          if(!p.overwrite&&(cur[field]||"").trim())return;
          upd[field]=val;
        });
        nextPD[day]=upd;
      });
      return nextPD;
    });
    setPastePacingModal(null);
  };

  const copyDay=(plan)=>{
    setAppModal({type:"dayPicker",icon:"\ud83d\udccb",title:"Copy Day \u2014 Select Source",message:"Copy FROM which day?",onDayPick:(fromDay)=>{
      setAppModal({type:"dayPicker",icon:"\ud83d\udccb",title:"Copy Day \u2014 Select Destination",message:`Copy FROM ${fromDay} TO which day?`,onDayPick:(toDay)=>{
        if(toDay===fromDay){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Same Day",message:"Source and destination cannot be the same day."});return;}
        handlePlanDataChange(plan.id,plan.course)(prev=>({...prev,[toDay]:JSON.parse(JSON.stringify(prev[fromDay]))}));
        setAppModal(null);
      }});
    }});
  };

  const cancelClass=(plan)=>{setCancelModalPlan(plan);setShowCancelModal(true);};
  const confirmCancelClass=(plan,days,reason,isHoliday)=>{
    handlePlanDataChange(plan.id,plan.course)(prev=>{
      const next={...prev};
      days.forEach(d=>{next[d]={...next[d],canceled:{reason:reason||"Canceled",date:new Date().toLocaleDateString(),isHoliday}};});
      return next;
    });
    if(isHoliday){
      const holidayDates=days.map(d=>getDayISO(plan.weekStart,d));
      const newHolidays=[...new Set([...schoolHolidays,...holidayDates])];
      setSchoolHolidays(newHolidays);persistHolidays(newHolidays);
      if(reason){const newL={...holidayLabels};holidayDates.forEach(d=>{newL[d]=reason;});setHolidayLabels(newL);persistHolidayLabels(newL);}
      setSavedPlans(prev=>{
        const updated=prev.map(p=>{
          if(p.id===plan.id)return p;
          const pd={...p.planData};let changed=false;
          DAYS.forEach(otherDay=>{
            const otherISO=getDayISO(p.weekStart,otherDay);
            if(holidayDates.includes(otherISO)&&!pd[otherDay]?.canceled){
              pd[otherDay]={...pd[otherDay],canceled:{reason:reason||"School Holiday",date:new Date().toLocaleDateString(),isHoliday:true}};
              changed=true;
            }
          });
          return changed?{...p,planData:pd}:p;
        });
        persist(updated);return updated;
      });
    }
    setShowCancelModal(false);setCancelModalPlan(null);
  };

  const saveEditDetails=(id,updates)=>{
    const bulkIds=editingDetailsPlan?._bulkIds;
    const targetIds=bulkIds?new Set(bulkIds):new Set([id]);
    const updated=savedPlans.map(p=>{
      if(!targetIds.has(p.id))return p;
      const termPart=updates.term&&updates.termWeek?`${updates.term} (${updates.termWeek})`:updates.term||updates.termWeek||"";
      const name=termPart?`${termPart}: ${p.course}`:p.course;
      return{...p,name:bulkIds?name:(() =>{const tp=updates.term&&updates.termWeek?`${updates.term} (${updates.termWeek})`:updates.term||updates.termWeek||"";return tp?`${tp}: ${updates.course}`:updates.course;})(),course:updates.course,term:updates.term,termWeek:updates.termWeek,...(bulkIds?{}:{weekStart:updates.weekISO}),updatedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})};
    });
    setSavedPlans(updated);persist(updated);setShowEditDetailsModal(false);setEditingDetailsPlan(null);
    if(bulkIds){setSelectedPlanIds(new Set());}
  };

  const bulkDelete=()=>{
    setAppModal({type:"confirm",icon:"\ud83d\uddd1\ufe0f",title:"Delete Selected Plans",message:`Delete ${selectedPlanIds.size} selected plan(s)? This cannot be undone.`,confirmLabel:"Delete All",confirmColor:T.error,onConfirm:()=>{
      const updated=savedPlans.filter(p=>!selectedPlanIds.has(p.id));setSavedPlans(updated);persist(updated);
      if(editingId&&selectedPlanIds.has(editingId))setEditingId(null);
      setSelectedPlanIds(new Set());    }});
  };
  const bulkDuplicate=()=>{
    setAppModal({type:"confirm",icon:"\ud83d\udccb",title:"Duplicate Selected Plans",message:`Duplicate ${selectedPlanIds.size} selected plan(s)?`,confirmLabel:"Duplicate All",onConfirm:()=>{
      const newPlans=savedPlans.filter(p=>selectedPlanIds.has(p.id)).map((plan,i)=>({...plan,id:`${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`,name:`${plan.name} (Copy)`,planData:JSON.parse(JSON.stringify(plan.planData)),createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),updatedAt:null,completed:false}));
      const updated=[...newPlans,...savedPlans];setSavedPlans(updated);persist(updated);
      setSelectedPlanIds(new Set());    }});
  };
  const bulkReset=()=>{
    setAppModal({type:"confirm",icon:"\ud83d\udd04",title:"Reset Selected Plans",message:`Reset ${selectedPlanIds.size} selected plan(s)?`,warning:"All lesson content will be cleared back to empty defaults. Plan details will be preserved. This cannot be undone.",confirmLabel:"Reset All",confirmColor:T.error,onConfirm:()=>{
      const updated=savedPlans.map(p=>selectedPlanIds.has(p.id)?{...p,planData:emptyWeek(),updatedAt:null}:p);
      setSavedPlans(updated);persist(updated);
      setSelectedPlanIds(new Set());    }});
  };
  const bulkArchive=()=>{
    setAppModal({type:"confirm",icon:"\ud83d\udce6",title:"Archive Selected Plans",message:`Archive ${selectedPlanIds.size} selected plan(s)?`,confirmLabel:"Archive All",onConfirm:()=>{
      const updated=savedPlans.map(p=>selectedPlanIds.has(p.id)?{...p,archived:true}:p);setSavedPlans(updated);persist(updated);
      if(editingId&&selectedPlanIds.has(editingId))setEditingId(null);
      setSelectedPlanIds(new Set());    }});
  };
  const bulkUnarchive=()=>{
    const updated=savedPlans.map(p=>selectedPlanIds.has(p.id)?{...p,archived:false}:p);setSavedPlans(updated);persist(updated);
    setSelectedPlanIds(new Set());  };
  const bulkEditDetails=()=>{
    const firstSelected=savedPlans.find(p=>selectedPlanIds.has(p.id));
    if(!firstSelected)return;
    setEditingDetailsPlan({...firstSelected,_bulkIds:[...selectedPlanIds]});
    setShowEditDetailsModal(true);
  };
  const [bulkExportPlans,setBulkExportPlans]=useState(null);
  const [completerJob,setCompleterJob]=useState(null); // { jobId, status:'running'|'done'|'error', elapsedMs, statusLine, errorMessage, completedPlan, targetPlanId }
  const completerTimerRef=useRef(null);
  const completerEventSourceRef=useRef(null);

  const startPlanCompletion=async(plan)=>{
    if(!plan){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"No Plan",message:"Open a lesson plan in the edit view first."});return;}
    setCompleterJob({jobId:null,status:"starting",elapsedMs:0,statusLine:"Contacting Claude CLI\u2026",errorMessage:null,completedPlan:null,targetPlanId:plan.id,targetCourse:plan.course});
    try{
      const body={plan:planToClaudeJSON(plan)};
      const resp=await fetch("http://localhost:5175/api/complete-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!resp.ok){const err=await resp.json().catch(()=>({error:resp.statusText}));throw new Error(err.error||`HTTP ${resp.status}`);}
      const {jobId}=await resp.json();
      const startedAt=Date.now();
      setCompleterJob(j=>j?{...j,jobId,status:"running",elapsedMs:0,statusLine:"Claude is working\u2026"}:j);
      if(completerTimerRef.current)clearInterval(completerTimerRef.current);
      completerTimerRef.current=setInterval(()=>{setCompleterJob(j=>j?{...j,elapsedMs:Date.now()-startedAt}:j);},500);

      const es=new EventSource(`http://localhost:5175/api/complete-plan/${jobId}/events`);
      completerEventSourceRef.current=es;
      es.onmessage=(e)=>{
        try{
          const evt=JSON.parse(e.data);
          if(evt.type==="status"||evt.type==="stderr"){
            setCompleterJob(j=>j?{...j,statusLine:evt.data.message}:j);
          }else if(evt.type==="error"){
            setCompleterJob(j=>j?{...j,status:"error",errorMessage:evt.data.message}:j);
          }else if(evt.type==="done"){
            // Fetch the actual result
            fetch(`http://localhost:5175/api/complete-plan/${jobId}/result`).then(r=>r.json()).then(result=>{
              if(result.status==="done"){
                setCompleterJob(j=>j?{...j,status:"done",completedPlan:result.plan,elapsedMs:result.elapsedMs}:j);
              }else{
                setCompleterJob(j=>j?{...j,status:"error",errorMessage:result.message||"Unknown error"}:j);
              }
            }).catch(err=>{
              setCompleterJob(j=>j?{...j,status:"error",errorMessage:err.message}:j);
            });
          }
        }catch{}
      };
      es.onerror=()=>{
        // EventSource auto-reconnects on some errors; only treat as fatal if job already done/error
        // The onexit handler in the server will close the stream cleanly when done
      };
    }catch(e){
      setCompleterJob(j=>j?{...j,status:"error",errorMessage:e.message}:j);
    }
  };

  const cancelPlanCompletion=async()=>{
    const job=completerJob;
    if(job?.jobId){
      try{await fetch(`http://localhost:5175/api/complete-plan/${job.jobId}`,{method:"DELETE"});}catch{}
    }
    if(completerEventSourceRef.current){completerEventSourceRef.current.close();completerEventSourceRef.current=null;}
    if(completerTimerRef.current){clearInterval(completerTimerRef.current);completerTimerRef.current=null;}
    setCompleterJob(null);
  };

  const closeCompleterModal=()=>{
    if(completerEventSourceRef.current){completerEventSourceRef.current.close();completerEventSourceRef.current=null;}
    if(completerTimerRef.current){clearInterval(completerTimerRef.current);completerTimerRef.current=null;}
    setCompleterJob(null);
  };

  // Merge helpers — produce new planData from current + completed
  const PLACEHOLDER_RE=/^(tbd|todo|\.\.\.|\?\?\?|n\/a|na|-)$/i;
  const isStubField=(v)=>{if(v==null)return true;const s=String(v).trim();if(s.length===0)return true;if(s.length<=20&&PLACEHOLDER_RE.test(s))return true;return false;};
  const isEmptyField=(v)=>{if(v==null)return true;return String(v).trim().length===0;};
  const mergeCellValue=(currentV,completedV,mode)=>{
    if(mode==="replace")return completedV;
    if(mode==="fillEmpties")return isEmptyField(currentV)?(completedV??currentV):currentV;
    if(mode==="smartMerge")return isStubField(currentV)?(completedV??currentV):currentV;
    return currentV;
  };
  const mergePlanData=(currentPlanData,completedPlanData,mode)=>{
    const out={};
    const days=["Monday","Tuesday","Wednesday","Thursday","Friday"];
    days.forEach(day=>{
      const cur=currentPlanData[day]||{};
      const comp=completedPlanData[day]||{};
      const merged={...cur};
      // Merge only the fields the skill is responsible for (text fields). Dropdowns and app-owned fields stay as-is.
      const textFields=["lessonTitle","keyVocab","objectives","essentialQs","bellWorkText","anticipatoryText","guidedPracticeText","guidedPracticeLabel","indPracticeText","conclusionText","msccrs","smps","sugContentLength","sugDifferentiation","sugPacing","sugEnhancements","centralFocus","priorKnowledge"];
      textFields.forEach(f=>{if(comp[f]!==undefined)merged[f]=mergeCellValue(cur[f],comp[f],mode);});
      out[day]=merged;
    });
    return out;
  };

  const applyCompletedPlan=async(mode)=>{
    const job=completerJob;
    if(!job||!job.completedPlan||!job.targetPlanId)return;
    const currentPlan=savedPlans.find(p=>p.id===job.targetPlanId);
    if(!currentPlan){closeCompleterModal();return;}

    // Auto-backup before Replace
    if(mode==="replace"){
      try{
        const sessionId=`session-${new Date().toISOString().slice(0,10)}-completer`;
        await fetch("http://localhost:5175/api/backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId,data:savedPlans})});
      }catch(e){console.warn("Pre-completion backup failed:",e);}
    }

    const newPlanData=mergePlanData(currentPlan.planData,job.completedPlan.planData,mode);
    handlePlanDataChange(job.targetPlanId,job.targetCourse||currentPlan.course)(newPlanData);
    closeCompleterModal();
    setAppModal({type:"alert",icon:"\u2728",title:"Plan Completed",message:`Applied completed plan (${mode==="replace"?"Replace":mode==="fillEmpties"?"Fill empties only":"Smart merge"}). Press Undo (\u21a9) to revert.`});
  };


  const copyToSpreadsheet=(plan)=>{
    const pd=plan.planData;const rows=[];
    rows.push(["",..."Monday,Tuesday,Wednesday,Thursday,Friday".split(",")].join("\t"));
    FIELDS.forEach(({key,label})=>{
      const vals=DAYS.map(d=>{const p=pd[d]||{};
        if(key==="bellWork")return p.bellWorkType||"";
        if(key==="lessonTitle")return p.lessonTitle||"";
        if(key==="anticipatorySet")return(p.anticipatorySelected||[]).join(", ");
        if(key==="guidedPractice")return p.guidedPracticeType||"";
        if(key==="independentPractice")return p.indPracticeType||"";
        if(key==="lesson")return p.lessonType||(p.lesson||"").replace(/\n/g," ");
        if(key==="conclusion")return p.conclusionType||(p.conclusionText||"").replace(/\n/g," ");
        if(key==="hmw")return(p.hmwSelected||["None"]).join(", ");
        if(key==="accommodations")return ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label).join(", ");
        if(key==="assessment"){const f=(p.assessment?.form||[]).join(", ");const s=p.assessment?.quizName||"";return[f,s].filter(Boolean).join(" | ");}
        return(p[key]||"").replace(/\n/g," ");
      });
      rows.push([label,...vals].join("\t"));
    });
    // One value for the whole week; it sits in the first column with the rest blank
    // rather than being repeated across all five days.
    {const wo=(pd.Monday?.weeklyObjectives||"").replace(/\n/g," ");if(wo)rows.push(["Weekly Objectives",wo,"","","",""].join("\t"));}
    navigator.clipboard.writeText(rows.join("\n")).then(()=>{setCopyMsg("Copied!");setTimeout(()=>setCopyMsg(""),2000);});
  };


  const addHoliday=()=>{
    if(!newHolidayDate)return;
    if(schoolHolidays.includes(newHolidayDate)){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Duplicate Holiday",message:"This date is already a holiday."});return;}
    const newH=[...schoolHolidays,newHolidayDate];setSchoolHolidays(newH);persistHolidays(newH);
    if(newHolidayLabel){const newL={...holidayLabels,[newHolidayDate]:newHolidayLabel};setHolidayLabels(newL);persistHolidayLabels(newL);}
    setSavedPlans(prev=>{
      const updated=prev.map(p=>{const pd={...p.planData};let changed=false;DAYS.forEach(day=>{const iso=getDayISO(p.weekStart,day);if(iso===newHolidayDate&&!pd[day]?.canceled){pd[day]={...pd[day],canceled:{reason:newHolidayLabel||"School Holiday",date:new Date().toLocaleDateString(),isHoliday:true}};changed=true;}});return changed?{...p,planData:pd}:p;});
      persist(updated);return updated;
    });
    setNewHolidayDate("");setNewHolidayLabel("");
  };
  const removeHoliday=(iso)=>{const newH=schoolHolidays.filter(d=>d!==iso);setSchoolHolidays(newH);persistHolidays(newH);const newL={...holidayLabels};delete newL[iso];setHolidayLabels(newL);persistHolidayLabels(newL);};

  return(
    <div style={{fontFamily:"Tahoma,sans-serif",background:T.bg,color:T.text,position:"fixed",inset:0,overflow:"hidden"}}>
      <style>{`@keyframes fadeOut{to{opacity:0}} @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .pt-scroll-container::-webkit-scrollbar{display:none} .pt-scroll-container{-ms-overflow-style:none;scrollbar-width:none} .pt-scroll-thumb:hover{box-shadow:0 0 8px 2px rgba(255,255,255,0.4),0 0 4px 1px rgba(200,200,200,0.3)} .dv-hit{background:#dbeafe;padding:0 2px;border-radius:2px} .dv-hit-active{background:#93c5fd;padding:0 2px;border-radius:2px;border:2px solid #2563eb;box-shadow:0 0 0 1px #2563eb}`}</style>
      <div id="pdf-preview-root" style={{display:"none"}}/>
      <div id="app-root" style={{display:"flex",flexDirection:"column",minHeight:0,transform:`scale(${settings.zoom/100})`,transformOrigin:"top left",width:`${10000/settings.zoom}%`,height:`${10000/settings.zoom}%`}}>
        <div style={{flexShrink:0}}>
          <div style={{background:T.headerBg,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div><div style={{fontSize:22,fontWeight:"bold",color:"#fff"}}>&#128208; Innova Lesson Planner</div><div style={{fontSize:13,color:settings.darkMode?"#888":"#b0c4de"}}>{settings.teacherName} &middot; {settings.schoolName} &middot; {settings.location}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {lastBackupTime&&<span style={{fontSize:11,color:settings.darkMode?"#888":"#b0c4de"}}>Last backup: {lastBackupTime}</span>}
              <button onClick={doBackup} title="Backup now" style={{background:"transparent",border:"none",color:"#fff",fontSize:16,cursor:"pointer",padding:"6px 10px",borderRadius:8,opacity:0.85,transition:"all 0.2s ease",transform:"scale(1)"}} onMouseEnter={e=>{const s=e.currentTarget.style;s.transform="scale(1.15)";s.opacity="1";s.textShadow="0 0 8px rgba(255,255,255,0.4)";}} onMouseLeave={e=>{const s=e.currentTarget.style;s.transform="scale(1)";s.opacity="0.85";s.textShadow="none";}}>{"\ud83d\udcbe"}</button>
              <button onClick={()=>setShowSettings(true)} style={{background:"transparent",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"6px 10px",borderRadius:8,opacity:0.85,transition:"all 0.2s ease",transform:"scale(1)"}} onMouseEnter={e=>{const s=e.currentTarget.style;s.transform="scale(1.1) rotate(30deg)";s.opacity="1";s.textShadow="0 0 8px rgba(255,255,255,0.4)";}} onMouseLeave={e=>{const s=e.currentTarget.style;s.transform="scale(1) rotate(0deg)";s.opacity="0.85";s.textShadow="none";}}>&#9881;</button>
            </div>
          </div>
          {!showSettings&&<div ref={dvTabsBarRef} style={{background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",padding:"0 16px"}}>
            {["plans","edit","progress","dailyView","pacing","pacingHistory","holidays","search"].map(tab=>{
              const labels={plans:"My Lesson Plans",edit:"Edit Lesson Plan",progress:"Progress",dailyView:"Daily View",pacing:"Pacing Guide",pacingHistory:"Pacing History",holidays:"Breaks",search:"Search"};
              const icons={plans:"\ud83d\udcc2",edit:"\u270f\ufe0f",progress:"\ud83d\udcc8",dailyView:"\ud83d\udcc5",pacing:"\ud83d\udcca",pacingHistory:"\u23f3",holidays:"\ud83c\udfd6\ufe0f",search:"\ud83d\udd0e"};
              const isActive=tab==="edit"?(activeTab==="edit"):(activeTab===tab&&!editingPlan);
              return(
                <button key={tab} onClick={()=>{if(tab==="edit"){const plan=savedPlans.find(p=>p.id===lastOpenedPlanId.current);setActiveTab("edit");setSelectedPlanIds(new Set());if(plan&&!plan.archived){setPrevTab(activeTab);setEditingId(plan.id);}else{setEditingId(null);}}else{setEditingId(null);setActiveTab(tab);setSelectedPlanIds(new Set());}}} style={{padding:"11px 24px",border:"none",borderBottom:`3px solid ${isActive?T.headerBg:"transparent"}`,background:"transparent",color:isActive?T.headerBg:"#94a3b8",fontWeight:"bold",cursor:"pointer",fontSize:15,transition:"all 0.2s ease",transform:"scale(1)"}} onMouseEnter={e=>{const s=e.currentTarget.style;s.transform="scale(1.1)";s.color=T.headerBg;s.textShadow="0 0 8px rgba(255,255,255,0.4)";}} onMouseLeave={e=>{const s=e.currentTarget.style;s.transform="scale(1)";s.color=isActive?T.headerBg:"#94a3b8";s.textShadow="none";}}>
                  {icons[tab]} {labels[tab]}
                </button>
              );
            })}
          </div>}
          {!showSettings&&!editingPlan&&activeTab==="edit"&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
                <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:12}}>{"\u270f\ufe0f"} Select a Lesson Plan</div>
                <div style={{fontSize:14,color:T.text,marginBottom:20}}>Select or create a lesson plan to start editing.</div>
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={()=>setActiveTab("plans")} style={{background:T.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Go to My Lesson Plans</button>
                </div>
              </div>
            </div>
          )}
          {!showSettings&&!editingPlan&&activeTab==="plans"&&(
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text}}>Saved Lesson Plans ({savedPlans.length})</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button onClick={()=>setShowCreateModal(true)} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:15,fontWeight:"bold",boxShadow:"0 3px 10px rgba(0,0,0,0.12)"}}>+ Create Lesson Plans</button>
                <button onClick={()=>setShowImportModal(true)} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:15,fontWeight:"bold",boxShadow:"0 3px 10px rgba(0,0,0,0.12)"}}>{"\ud83d\udce5"} Import Lesson Plan</button>
              </div>
            </div>
          )}
          {selectedPlanIds.size>0&&(
            <div style={{background:"#1e3a5c",padding:"10px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{color:"#fff",fontWeight:"bold",fontSize:14}}>{selectedPlanIds.size} selected</span>
              {hasSelectedArchived()?(<>
              <button onClick={bulkDelete} style={{background:T.error,color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\uddd1\ufe0f"} Delete</button>
              <button onClick={bulkUnarchive} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u21a9"} Unarchive</button>
              </>):(<>
              <button onClick={bulkEditDetails} style={{background:"#b45309",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u270f\ufe0f"} Edit Details</button>
              <button onClick={bulkDuplicate} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udccb"} Duplicate</button>
              <button onClick={bulkArchive} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udce6"} Archive</button>
              <button onClick={bulkReset} style={{background:"#ca8a04",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udd04"} Reset</button>
              <button onClick={()=>{setBulkExportPlans(savedPlans.filter(p=>selectedPlanIds.has(p.id)));}} style={{background:"#0369a1",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udce4"} Export</button>
              </>)}
              <button onClick={()=>{if(hasSelectedArchived()){setSelectedPlanIds(new Set(filteredArchived.map(p=>p.id)));}else{setSelectedPlanIds(new Set(filteredActive.map(p=>p.id)));}}} style={{marginLeft:"auto",background:"transparent",color:"#93c5fd",border:"1px solid #93c5fd",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Select All</button>
            </div>
          )}
        </div>
        <div style={{flex:1,minHeight:0,overflowY:"auto",position:"relative"}}>
          {showSettings?(<SettingsView settings={settings} setSettings={setSettings} onBack={()=>{if(settingsDirty){setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Unsaved Settings",message:"You have unsaved settings changes. Save before leaving?",confirmLabel:"Save & Leave",confirmColor:T.accentBlue||"#2563eb",onConfirm:()=>{saveSettings();setShowSettings(false);},cancelLabel:"Discard",onCancel:()=>{setShowSettings(false);}});}else setShowSettings(false);}} saveSettings={saveSettings} settingsDirty={settingsDirty} setAppModal={setAppModal} savedPlans={savedPlans} setSavedPlans={setSavedPlans} schoolHolidays={schoolHolidays} setSchoolHolidays={setSchoolHolidays} holidayLabels={holidayLabels} setHolidayLabels={setHolidayLabels} persist={persist} persistHolidays={persistHolidays} persistHolidayLabels={persistHolidayLabels} lastBackupTime={lastBackupTime} setLastBackupTime={setLastBackupTime} doBackup={doBackup} backupSessionId={backupSessionId} pacingData={pacingData} setPacingData={setPacingData} pacingUndoStack={pacingUndoStack} setPacingUndoStack={setPacingUndoStack} pacingRedoStack={pacingRedoStack} setPacingRedoStack={setPacingRedoStack}/>
          ):editingPlan&&activeTab==="edit"?(
            <div style={{position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
              {/* Sticky toolbar container */}
              <div style={{position:"sticky",top:0,zIndex:40}} onMouseLeave={handleToolbarMouseLeave}>
                {/* Header row — always visible */}
                {(()=>{const coursePlans=savedPlans.filter(p=>p.course===editingPlan.course&&!p.archived).sort((a,b)=>a.weekStart.localeCompare(b.weekStart));const cpIdx=coursePlans.findIndex(p=>p.id===editingId);const hasDirect=(dir)=>{const ti=cpIdx+dir;if(ti<0||ti>=coursePlans.length)return false;const cur=parseLocalDate(coursePlans[cpIdx].weekStart);const tgt=parseLocalDate(coursePlans[ti].weekStart);return Math.abs(Math.round((tgt-cur)/(1000*60*60*24)))===7;};const prevLabel=hasDirect(-1)?"\u003c Prev":"\u2728 Prev";const nextLabel=hasDirect(1)?"Next \u003e":"\u2728 Next";const _ws=parseLocalDate(editingPlan.weekStart);const _weFF=new Date(_ws);_weFF.setDate(_ws.getDate()+6);_weFF.setHours(23,59,59,999);const _we=new Date(_ws);_we.setDate(_we.getDate()+4);_we.setHours(23,59,59,999);const _today=new Date();_today.setHours(0,0,0,0);const _nwe=new Date(_today);_nwe.setDate(_today.getDate()+(7-_today.getDay()));_nwe.setHours(23,59,59,999);const _isCurrent=_ws<=_today&&_today<=_weFF;const _isPast=_we<_today&&!_isCurrent;const _isNextWeek=_ws>_today&&_ws<=_nwe&&!_isCurrent;const _toolbarBg=_isCurrent?"#fff7ed":_isPast?"#eff6ff":_isNextWeek?"#faf5ff":"#f0fdf4";const _toolbarAccent=_isCurrent?"#f97316":_isPast?"#3b82f6":_isNextWeek?"#7c3aed":"#16a34a";return(
                <div style={{background:_toolbarBg,borderBottom:`2px solid ${_toolbarAccent}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <button onClick={()=>{setEditingId(null);setUndoStack([]);setRedoStack([]);setActiveTab(prevTab);}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>&larr; Back</button>
                  <div style={{flex:1,textAlign:"center"}} onMouseEnter={handleToolbarMouseEnter}>
                    <div style={{fontSize:22,fontWeight:700,color:T.text}}>{editingPlan.name}</div>
                  </div>
                  <button onClick={()=>setCollapsedRows(new Set(ALL_ROW_KEYS))} title="Collapse All Rows" disabled={collapsedRows.size===ALL_ROW_KEYS.length} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"7px 12px",cursor:collapsedRows.size===ALL_ROW_KEYS.length?"default":"pointer",fontSize:17,fontWeight:"bold",opacity:collapsedRows.size===ALL_ROW_KEYS.length?0.4:1,lineHeight:1}}>{"\u2212"}</button>
                  <button onClick={()=>setCollapsedRows(new Set())} title="Expand All Rows" disabled={collapsedRows.size===0} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"7px 12px",cursor:collapsedRows.size===0?"default":"pointer",fontSize:17,fontWeight:"bold",opacity:collapsedRows.size===0?0.4:1,lineHeight:1}}>+</button>
                  <div style={{width:1,height:24,background:"#6b7280",flexShrink:0}}/>
                  <button disabled={!hasDirect(-1)} onClick={()=>{if(hasDirect(-1))navigatePlan(-1);}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:hasDirect(-1)?"pointer":"default",fontSize:16,fontWeight:"bold",opacity:hasDirect(-1)?1:0.3}}>{"\u25c0"}</button>
                  <button onClick={()=>{const plan=savedPlans.find(p=>p.id===editingId);if(!plan)return;const cp=savedPlans.filter(p=>p.course===plan.course&&!p.archived).sort((a,b)=>a.weekStart.localeCompare(b.weekStart));const ci=cp.findIndex(p=>p.id===editingId);showCourseNavModal(plan.course,cp,ci,1);}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Navigate Lesson Plans</button>
                  <button disabled={!hasDirect(1)} onClick={()=>{if(hasDirect(1))navigatePlan(1);}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:hasDirect(1)?"pointer":"default",fontSize:16,fontWeight:"bold",opacity:hasDirect(1)?1:0.3}}>{"\u25b6"}</button>
                  <div style={{width:1,height:24,background:"#6b7280",flexShrink:0}}/>
                  <button onClick={handleUndo} disabled={undoStack.length===0} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:undoStack.length===0?"default":"pointer",fontSize:14,fontWeight:"bold",opacity:undoStack.length===0?0.4:1}}>{"\u21a9"} Undo</button>
                  <button onClick={handleRedo} disabled={redoStack.length===0} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:redoStack.length===0?"default":"pointer",fontSize:14,fontWeight:"bold",opacity:redoStack.length===0?0.4:1}}>{"\u21aa"} Redo</button>
                </div>);})()}
                {/* Collapsible: Two toolbar rows with slide animation */}
                {editorToolsExpanded&&(()=>{const _cws=parseLocalDate(editingPlan.weekStart);const _cweFF=new Date(_cws);_cweFF.setDate(_cws.getDate()+6);_cweFF.setHours(23,59,59,999);const _cwe=new Date(_cws);_cwe.setDate(_cwe.getDate()+4);_cwe.setHours(23,59,59,999);const _ctoday=new Date();_ctoday.setHours(0,0,0,0);const _cnwe=new Date(_ctoday);_cnwe.setDate(_ctoday.getDate()+(7-_ctoday.getDay()));_cnwe.setHours(23,59,59,999);const _cisCurrent=_cws<=_ctoday&&_ctoday<=_cweFF;const _cisPast=_cwe<_ctoday&&!_cisCurrent;const _cisNextWeek=_cws>_ctoday&&_cws<=_cnwe&&!_cisCurrent;const _collBg=_cisCurrent?"#fff7ed":_cisPast?"#eff6ff":_cisNextWeek?"#faf5ff":"#f0fdf4";const _collAccent=_cisCurrent?"#f97316":_cisPast?"#3b82f6":_cisNextWeek?"#7c3aed":"#16a34a";return(
                  <div onMouseEnter={handleToolbarMouseEnter} style={{background:_collBg,borderBottom:`2px solid ${_collAccent}`,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",animation:"slideDown 200ms ease-out"}}>
                    {/* Row 1: Action buttons + Search bar */}
                    <div style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",borderBottom:`1px solid ${T.border}`}}>
                      <button onClick={()=>setShowEditDetailsModal(true)} style={{background:"#b45309",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u270f\ufe0f"} Edit Details</button>
                      <button onClick={()=>duplicatePlan(editingPlan)} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udccb"} Duplicate</button>
                      <button onClick={()=>setAppModal({type:"confirm",icon:"\ud83d\udce6",title:"Archive Plan",message:`Archive "${editingPlan.name}"? You can restore it later.`,confirmLabel:"Archive",onConfirm:()=>archivePlan(editingPlan.id)})} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udce6"} Archive</button>
                      <button onClick={()=>setShowResetModal(editingPlan)} style={{background:"#ca8a04",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udd04"} Reset Plan</button>
                      <button onClick={()=>setBulkExportPlans([editingPlan])} style={{background:"#0369a1",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udce4"} Export</button>
                      <button onClick={()=>setShowImportModal(true)} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\ud83d\udce5"} Import</button>
                      {!HUB_ONLINE&&<button onClick={()=>startPlanCompletion(editingPlan)} disabled={!!completerJob} title="Run the lesson-plan-completer skill on this plan via Claude CLI" style={{background:completerJob?"#9ca3af":"#db2777",color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",cursor:completerJob?"default":"pointer",fontSize:13,fontWeight:"bold"}}>{"\u2728"} Complete with Claude</button>}
                      {/* Search bar — fills remaining space */}
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:4,background:T.surface2,borderRadius:8,padding:"4px 8px",border:`1px solid ${T.border}`}}>
                        <span style={{fontSize:13}}>{"\ud83d\udd0d"}</span>
                        <input value={editorSearch} onChange={e=>{setEditorSearch(e.target.value);setEditorSearchIdx(0);}} placeholder="Search cells..." style={{border:"none",outline:"none",background:"transparent",flex:1,minWidth:60,fontSize:13,color:T.text}}/>
                        {editorSearch&&<>
                          <span style={{fontSize:12,color:T.textMuted,whiteSpace:"nowrap"}}>{editorSearchMatches.length?`${editorSearchIdx+1} of ${editorSearchMatches.length}`:"0 results"}</span>
                          <button onClick={()=>setEditorSearchIdx(i=>(i-1+editorSearchMatches.length)%editorSearchMatches.length)} disabled={editorSearchMatches.length===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"2px 4px",color:T.text}}>{"\u25c0"}</button>
                          <button onClick={()=>setEditorSearchIdx(i=>(i+1)%editorSearchMatches.length)} disabled={editorSearchMatches.length===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"2px 4px",color:T.text}}>{"\u25b6"}</button>
                          <button onClick={()=>{setEditorSearch("");setEditorSearchMatches([]);setEditorSearchIdx(0);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"2px 4px",color:T.error}}>{"\u2715"}</button>
                        </>}
                      </div>
                    </div>
                    {/* Row 2: Utility buttons (no emojis except Print View) */}
                    <div style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      {[
                        {label:"Print Preview",bg:"#fff",color:T.text,border:`1px solid ${T.border}`,fn:()=>setPrintPreviewHtml(buildPrintHtml(editingPlan.planData,editingPlan.course,parseLocalDate(editingPlan.weekStart),editingPlan.termWeek))},
                        {label:"📄 Export PDF",bg:"#dc2626",color:"#fff",border:"none",fn:()=>{const html=buildPrintHtml(editingPlan.planData,editingPlan.course,parseLocalDate(editingPlan.weekStart),editingPlan.termWeek);exportPdfFromHtml(html,`${editingPlan.course.replace(/\s/g,"-")}-${editingPlan.termWeek||"Week"}.pdf`,{orientation:"landscape",renderWidth:940,rowSelector:"tr",scale:3,quality:0.75,header:`${editingPlan.course} — ${editingPlan.termWeek||""}`.trim().replace(/—\s*$/,"").trim(),footer:`${settings.teacherName||"Dr. Derrick DeMars"} · ${settings.schoolName||"Innova Preparatory School"}, ${settings.location||"Hattiesburg, MS"}`});}},
                        {label:"Cancel Class",bg:"#fff",color:T.error,border:`1px solid ${T.error}`,fn:()=>cancelClass(editingPlan)},
                        {label:"Copy to Spreadsheet",bg:"#fff",color:T.accentBlue,border:`1px solid ${T.accentBlue}`,fn:()=>copyToSpreadsheet(editingPlan)},
                        {label:"Copy Day",bg:"#fff",color:T.text,border:`1px solid ${T.border}`,fn:()=>copyDay(editingPlan)},
                        {label:"Copy to Next Week",bg:"#fff",color:"#16a34a",border:"1px solid #16a34a",fn:()=>setAppModal({type:"confirm",icon:"\ud83d\udcc5",title:"Create Next Week",message:`Create next week's plan for ${editingPlan.course}?`,confirmLabel:"Create",onConfirm:()=>copyToNextWeek(editingPlan)})},
                        {label:"Carry Forward",bg:"#fff",color:"#7c3aed",border:"1px solid #7c3aed",fn:()=>carryForward(editingPlan)},
                        {label:"Pacing Guide Paste",bg:"#fff",color:"#0d9488",border:"1px solid #0d9488",fn:()=>openPastePacingModal(editingPlan)},
                      ].map(({label,bg,color,border,fn})=>(
                        <button key={label} onClick={fn} style={{background:bg,color,border,borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold",whiteSpace:"nowrap"}}>{label}</button>
                      ))}
                      {copyMsg&&<span style={{fontSize:13,color:"#16a34a",fontWeight:"bold"}}>{copyMsg}</span>}
                    </div>
                  </div>
                );})()}
              </div>
              {/* Calendar import banner */}
              {showBridgeImportBanner&&bridgeNewHolidays.length>0&&(
                <div style={{background:"#eff6ff",borderBottom:"1px solid #93c5fd",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,fontSize:13}}>
                  <span style={{fontSize:16}}>&#128197;</span>
                  <span style={{flex:1,color:"#1e3a8a"}}>Plugin detected <strong>{bridgeNewHolidays.length}</strong> school holidays not in your calendar.</span>
                  <button onClick={()=>importBridgeHolidays(bridgeNewHolidays)} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>Import All</button>
                  <button onClick={()=>{setShowBridgeImportBanner(false);setBridgeImportDismissed(true);localStorage.setItem("bridgeImportDismissed","true");}} style={{background:"none",border:"1px solid #93c5fd",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,color:"#2563eb"}}>Dismiss</button>
                </div>
              )}
              {/* IC reteach banner */}
              {/* Grid area */}
              <div style={{position:"relative",flex:1,minHeight:0,display:"flex"}}>
                <div style={{flex:1,minWidth:0}}>
                <SimplePlannerGrid
                pd={editingPlan.planData}
                setPD={handlePlanDataChange(editingPlan.id,editingPlan.course)}
                course={editingPlan.course}
                weekStart={parseLocalDate(editingPlan.weekStart)}
                weekStartISO={editingPlan.weekStart}
                termWeek={editingPlan.termWeek||""}
                schoolHolidays={schoolHolidays}
                onRemoveHoliday={(iso)=>{const h=schoolHolidays.filter(d=>d!==iso);setSchoolHolidays(h);persistHolidays(h);}}
                setAppModal={setAppModal}
                searchQuery={editorSearch.length>=3?editorSearch:""}
                searchMatches={editorSearchMatches}
                searchMatchIndex={editorSearchIdx}
                activeMatchRef={activeMatchRef}
                collapsedRows={collapsedRows}
                setCollapsedRows={setCollapsedRows}
                settings={settings}
              />
              <AIToast count={aiCount}/>
              </div>
              </div>
            </div>
          ):activeTab==="plans"?(
            <div style={{padding:"16px 24px 24px"}}>
              {loading?(
                <div style={{color:T.textMuted,textAlign:"center",padding:40,fontSize:15}}>Loading...</div>
              ):sorted.length===0?(
                <div style={{color:T.textMuted,fontSize:15,textAlign:"center",padding:60,background:T.surface,borderRadius:12,border:`1px dashed ${T.border}`}}>
                  <div style={{fontSize:40,marginBottom:12}}>&#128203;</div>
                  <div style={{fontWeight:"bold",marginBottom:8,color:T.text}}>No lesson plans yet</div>
                  <div>Click <strong>+ Create New Lesson Plan</strong> to get started.</div>
                </div>
              ):(()=>{
                const currentWeekStart=new Date(today);currentWeekStart.setDate(today.getDate()-today.getDay());
                const currentWeekEnd=new Date(currentWeekStart);currentWeekEnd.setDate(currentWeekStart.getDate()+6);currentWeekEnd.setHours(23,59,59,999);
                const nextWeekStart=new Date(currentWeekStart);nextWeekStart.setDate(currentWeekStart.getDate()+7);
                const nextWeekEnd=new Date(nextWeekStart);nextWeekEnd.setDate(nextWeekStart.getDate()+6);nextWeekEnd.setHours(23,59,59,999);
                const lastWeekStart=new Date(currentWeekStart);lastWeekStart.setDate(currentWeekStart.getDate()-7);
                const lastWeekEnd=new Date(lastWeekStart);lastWeekEnd.setDate(lastWeekStart.getDate()+6);lastWeekEnd.setHours(23,59,59,999);
                const groups={past:[],lastWeek:[],currentWeek:[],nextWeek:[],upcoming:[],archived:filteredArchived};
                filteredActive.forEach(plan=>{
                  const ws=parseLocalDate(plan.weekStart);const we=new Date(ws);we.setDate(we.getDate()+4);we.setHours(23,59,59,999);
                  if(we<lastWeekStart) groups.past.push(plan);
                  else if(ws>=lastWeekStart&&ws<=lastWeekEnd) groups.lastWeek.push(plan);
                  else if(ws>=currentWeekStart&&ws<=currentWeekEnd) groups.currentWeek.push(plan);
                  else if(ws>=nextWeekStart&&ws<=nextWeekEnd) groups.nextWeek.push(plan);
                  else groups.upcoming.push(plan);
                });
                const renderCard=(plan)=>{
                  const ws=parseLocalDate(plan.weekStart);const wDates=getWeekDates(ws);
                  const we=new Date(ws);we.setDate(we.getDate()+4);we.setHours(23,59,59,999);
                  const weFullWeek=new Date(ws);weFullWeek.setDate(ws.getDate()+6);weFullWeek.setHours(23,59,59,999);
                  const isCurrent=ws<=today&&today<=weFullWeek;
                  const isPast=we<today&&!isCurrent;
                  const isNextWeek=ws>today&&ws<=nextWeekEnd&&!isCurrent;
                  const isArchived=plan.archived===true;
                  const timeColor=isArchived?"#9ca3af":isCurrent?"#f97316":isPast?"#3b82f6":isNextWeek?"#7c3aed":"#16a34a";
                  const timeBg=isArchived?"#f9fafb":isCurrent?"#fff7ed":isPast?"#eff6ff":isNextWeek?"#faf5ff":"#f0fdf4";
                  const timeBorder=isArchived?"#9ca3af":isCurrent?"#f97316":isPast?"#3b82f6":isNextWeek?"#7c3aed":"#16a34a";
                  const completion=plan.updatedAt?calcPlanCompletion(plan.planData):null;
                  const completionPct=completion!==null?Math.round(completion*100):null;
                  const isSelected=selectedPlanIds.has(plan.id);
                  const toggleSelection=(e)=>{e.stopPropagation();const clickedIsArchived=plan.archived===true;const curHasArchived=selectedPlanIds.size>0&&hasSelectedArchived();const curHasActive=selectedPlanIds.size>0&&hasSelectedActive();if((clickedIsArchived&&curHasActive)||(!clickedIsArchived&&curHasArchived)){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Cannot Mix Selections",message:"You cannot select active and archived plans at the same time. Please deselect your current selection first.",warning:"Clear your selection before choosing plans from a different group."});return;}setSelectedPlanIds(prev=>{const next=new Set(prev);if(next.has(plan.id))next.delete(plan.id);else next.add(plan.id);return next;});};
                  return(
                    <div key={plan.id} onClick={()=>{if(plan.archived)return;setPrevTab(activeTab);setActiveTab("edit");setEditingId(plan.id);lastOpenedPlanId.current=plan.id;}} style={{background:isSelected?"#dbeafe":timeBg,borderTop:isSelected?"2px solid #3b82f6":`1px solid ${timeBorder}`,borderRight:isSelected?"2px solid #3b82f6":`1px solid ${timeBorder}`,borderBottom:isSelected?"2px solid #3b82f6":`1px solid ${timeBorder}`,borderLeft:`5px solid ${timeColor}`,borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,opacity:isArchived?0.6:plan.completed?0.7:1,cursor:isArchived?"default":"pointer",transition:"border 0.15s, background 0.15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                        <input type="checkbox" checked={isSelected} onChange={toggleSelection} onClick={e=>e.stopPropagation()} style={{width:20,height:20,accentColor:T.accentBlue,cursor:"pointer",flexShrink:0}}/>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:16,fontWeight:"bold",color:T.text,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            {plan.name}
                            {plan.completed&&<span style={{fontSize:11,background:"#dcfce7",color:"#15803d",borderRadius:10,padding:"2px 8px"}}>{"\u2713"} Completed</span>}
                            {isCurrent&&<span style={{fontSize:11,background:"#ffedd5",color:"#c2410c",borderRadius:10,padding:"2px 8px"}}>{"\ud83d\udccc"} This Week</span>}
                            {isNextWeek&&<span style={{fontSize:11,background:"#ede9fe",color:"#6d28d9",borderRadius:10,padding:"2px 8px"}}>Next Week</span>}
                            {!isCurrent&&!isNextWeek&&!isPast&&<span style={{fontSize:11,background:"#dcfce7",color:"#15803d",borderRadius:10,padding:"2px 8px"}}>Upcoming</span>}
                            {isPast&&!isArchived&&<span style={{fontSize:11,background:"#dbeafe",color:"#1d4ed8",borderRadius:10,padding:"2px 8px"}}>Past</span>}
                            {isArchived&&<span style={{fontSize:11,background:"#f3f4f6",color:"#6b7280",borderRadius:10,padding:"2px 8px"}}>{"\ud83d\udce6"} Archived</span>}
                          </div>
                          <div style={{fontSize:13,color:T.textMuted,marginTop:2}}>
                            {plan.course} {plan.term?`\u00b7 ${plan.term}`:""}{plan.termWeek?` \u00b7 ${plan.termWeek}`:""} &middot; {formatDate(wDates[0])} {"\u2013"} {formatDate(wDates[4])} &middot; Created {plan.createdAt}
                            {plan.updatedAt&&<span style={{color:"#ea580c",fontWeight:"bold"}}> &middot; Last edited {plan.updatedAt}</span>}
                          </div>
                        </div>
                      </div>
                      <div onClick={e=>{e.stopPropagation();toggleCompleted(plan.id);}} style={{flexShrink:0,cursor:"pointer"}} title={plan.completed?"Completed":`${completionPct??0}% complete`}>
                        {plan.completed?(<svg width={44} height={44}><circle cx={22} cy={22} r={18} fill="#16a34a"/><text x={22} y={22} textAnchor="middle" dominantBaseline="central" fontSize={20} fill="#fff">{"\u2713"}</text></svg>):(<svg width={44} height={44}><circle cx={22} cy={22} r={18} fill="none" stroke="#e5e7eb" strokeWidth={3}/><circle cx={22} cy={22} r={18} fill="none" stroke={timeColor} strokeWidth={3} strokeDasharray={`${2*Math.PI*18*(completion??0)} ${2*Math.PI*18}`} strokeLinecap="round" transform="rotate(-90 22 22)"/><text x={22} y={22} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600" fill={T.textMuted}>{completionPct??0}%</text></svg>)}
                      </div>
                    </div>
                  );
                };
                const groupMeta=[
                  {key:"upcoming",label:"Upcoming",color:"#16a34a"},
                  {key:"nextWeek",label:"Next Week",color:"#7c3aed"},
                  {key:"currentWeek",label:"\ud83d\udccc Current Week",color:"#f97316"},
                  {key:"lastWeek",label:"Last Week",color:"#3b82f6"},
                  {key:"past",label:"Past Plans",color:"#3b82f6"},
                  {key:"archived",label:"\ud83d\udce6 Archived",color:"#9ca3af"},
                ];
                const renderGroup=({key,label,color})=>{
                  const plans=groups[key];if(plans.length===0)return null;
                  const collapsed=collapsedGroups[key];
                  return(<React.Fragment key={key}>
                    <div onClick={()=>toggleGroup(key)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:T.surface2,borderRadius:8,cursor:"pointer",userSelect:"none",borderTop:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,borderLeft:`4px solid ${color}`}}>
                      <div style={{fontWeight:"bold",color:T.text}}>{collapsed?"\u25b6":"\u25bc"} {label} ({plans.length})</div>
                    </div>
                    {!collapsed&&plans.map(renderCard)}
                  </React.Fragment>);
                };
                return(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {groupMeta.map(renderGroup)}
                  </div>
                );
              })()}
            </div>
          ):activeTab==="holidays"?(
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:16}}>{"\ud83c\udfd6\ufe0f"} School Holidays & Breaks</div>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div>
                  <label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Date</label>
                  <input type="date" value={newHolidayDate} onChange={e=>setNewHolidayDate(e.target.value)} style={{border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,background:T.surface,color:T.text}}/>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Label / Reason (optional)</label>
                  <input value={newHolidayLabel} onChange={e=>setNewHolidayLabel(e.target.value)} placeholder='e.g. "Spring Break"' style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                </div>
                <button onClick={addHoliday} style={{background:"#d97706",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>+ Add Holiday</button>
              </div>
              {[...schoolHolidays].sort().length===0?(
                <div style={{padding:40,textAlign:"center",color:T.textMuted}}>
                  <div style={{fontSize:40,marginBottom:12}}>{"\ud83c\udf84"}</div>
                  <div style={{fontWeight:"bold",color:T.text}}>No holidays set</div>
                  <div>Add holidays above or use the "School Holiday" checkbox when canceling a class.</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[...schoolHolidays].sort().map(iso=>{const d=parseLocalDate(iso);const dayName=d.toLocaleDateString("en-US",{weekday:"long"});return(
                    <div key={iso} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <span style={{fontWeight:"bold",color:T.text}}>{formatDate(d)}</span>
                        <span style={{color:T.textMuted,marginLeft:8}}>{dayName}</span>
                        {holidayLabels[iso]&&<span style={{marginLeft:12,color:"#d97706",fontStyle:"italic"}}>{holidayLabels[iso]}</span>}
                      </div>
                      <button onClick={()=>removeHoliday(iso)} style={{background:T.error,color:"#fff",border:"none",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>Remove</button>
                    </div>
                  );})}
                </div>
              )}
            </div>
          ):activeTab==="search"?(
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:16}}>{"\ud83d\udd0e"} Search All Plans</div>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search lesson titles, vocabulary, objectives, standards..." style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 16px",fontSize:15,boxSizing:"border-box",marginBottom:16,background:T.surface,color:T.text}}/>
              {searchQuery.trim()&&<div style={{fontSize:13,color:T.textMuted,marginBottom:12}}>{searchResults.length} plan{searchResults.length!==1?"s":""} matched</div>}
              {searchResults.map(({plan,matches})=>{const cc=COURSE_COLORS[plan.course]||{bg:T.accentBlue};const ws=parseLocalDate(plan.weekStart);const wDates=getWeekDates(ws);return(
                <div key={plan.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 18px",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div>
                      <span style={{fontWeight:"bold",fontSize:15,color:T.text}}>{plan.name}</span>
                      <span style={{background:cc.bg,color:"#fff",borderRadius:4,padding:"1px 6px",fontSize:11,marginLeft:8}}>{plan.course}</span>
                      <span style={{fontSize:12,color:T.textMuted,marginLeft:8}}>{formatDate(wDates[0])} {"\u2013"} {formatDate(wDates[4])}</span>
                    </div>
                    <button onClick={()=>{setPrevTab(activeTab);setActiveTab("plans");setEditingId(plan.id);lastOpenedPlanId.current=plan.id;}} style={{background:T.accentBlue,color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Open</button>
                  </div>
                  {matches.slice(0,5).map((m,i)=>(
                    <div key={i} style={{fontSize:13,color:T.textMuted,padding:"4px 0",borderTop:i>0?`1px solid ${T.border}`:"none"}}>
                      <span style={{fontWeight:"bold",color:T.text}}>{m.day} / {m.field}:</span>{" "}
                      <HighlightText text={m.text.slice(0,200)} query={searchQuery}/>
                    </div>
                  ))}
                  {matches.length>5&&<div style={{fontSize:12,color:T.textMuted,fontStyle:"italic"}}>...and {matches.length-5} more matches</div>}
                </div>
              );})}
              {searchQuery.trim()&&searchResults.length===0&&<div style={{padding:40,textAlign:"center",color:T.textMuted}}>No results found.</div>}
            </div>
          ):activeTab==="dailyView"?(
            <div style={{padding:0}}>
              {(()=>{
                const currentWeekStart=dailyViewWeekStart;
                const dayIdx=DAYS.indexOf(dailyViewDay);
                const dayDate=new Date(currentWeekStart);dayDate.setDate(currentWeekStart.getDate()+dayIdx+1);
                const displayDate=`${dayDate.getDate()} ${dayDate.toLocaleDateString("en-US",{month:"short"}).replace(".","").slice(0,3)} ${String(dayDate.getFullYear()).slice(-2)}`;
                const plansThisWeek=savedPlans.filter(p=>{const ws=parseLocalDate(p.weekStart);return ws.getTime()===currentWeekStart.getTime()&&!p.archived;});
                const planByCourse={};plansThisWeek.forEach(p=>{planByCourse[p.course]=p;});
                // Shared with the PDF builder so the two can never disagree — see DAILY_VIEW_ROWS.
                const ROW_LABELS=DAILY_VIEW_ROWS;
                const dvSlug=s=>s.replace(/[^a-zA-Z0-9]/g,"_");
                const scrollToEl=(id)=>{const el=document.getElementById(id);if(!el)return;let scrollParent=el.parentElement;while(scrollParent){const s=getComputedStyle(scrollParent);if(s.overflowY==="auto"||s.overflowY==="scroll"){break;}scrollParent=scrollParent.parentElement;}if(!scrollParent)scrollParent=document.documentElement;const toolbarH=dvToolbarRef.current?dvToolbarRef.current.offsetHeight:60;const offset=toolbarH+16;const elRect=el.getBoundingClientRect();const parentRect=scrollParent.getBoundingClientRect();const y=scrollParent.scrollTop+(elRect.top-parentRect.top)-offset;scrollParent.scrollTo({top:y,behavior:"smooth"});};
                const blockEditKeys=(e)=>{const nav=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","Shift","Control","Meta","Alt"];if(nav.includes(e.key))return;if((e.ctrlKey||e.metaKey)&&["a","z","y"].includes(e.key.toLowerCase()))return;e.preventDefault();};
                const applyDvAnnotation=(command,value)=>{
                  const sel=window.getSelection();if(!sel||sel.isCollapsed||sel.rangeCount===0)return;
                  const range=sel.getRangeAt(0);const container=range.commonAncestorContainer;
                  const cellEl=container.nodeType===1?container.closest("[id^='dv-cell-']"):container.parentElement?.closest("[id^='dv-cell-']");
                  if(!cellEl)return;
                  const idParts=cellEl.id.replace("dv-cell-","");const firstDash=idParts.lastIndexOf("-");
                  const cSlug=idParts;
                  let foundCourse=null,foundField=null;
                  for(const course of DAILY_ORDER){const cs=dvSlug(course);
                    for(const{key}of ROW_LABELS){if(cellEl.id===`dv-cell-${cs}-${key}`){foundCourse=course;foundField=key;break;}}
                    if(foundCourse)break;}
                  if(!foundCourse||!foundField)return;
                  const plan=planByCourse[foundCourse];if(!plan)return;
                  const prevHtml=cellEl.innerHTML;
                  if(command==="bold")document.execCommand("bold",false,null);
                  else if(command==="italic")document.execCommand("italic",false,null);
                  else if(command==="underline")document.execCommand("underline",false,null);
                  else if(command==="strikethrough")document.execCommand("strikeThrough",false,null);
                  else if(command==="highlight")document.execCommand("backColor",false,value||dvHighlightColor);
                  else if(command==="clear")document.execCommand("removeFormat",false,null);
                  const newHtml=cellEl.innerHTML;
                  if(newHtml===prevHtml)return;
                  setDvUndoStack(prev=>[...prev.slice(-(25-1)),{planId:plan.id,day:dailyViewDay,field:foundField,before:prevHtml,after:newHtml}]);
                  setDvRedoStack([]);
                  const updatedPlans=savedPlans.map(p=>{
                    if(p.id!==plan.id)return p;const np={...p,planData:{...p.planData}};const dd={...(np.planData[dailyViewDay]||emptyDay())};
                    if(!dd.dvAnnotations)dd.dvAnnotations={};dd.dvAnnotations[foundField]=newHtml;np.planData[dailyViewDay]=dd;
                    np.updatedAt=new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
                    return np;
                  });
                  setSavedPlans(updatedPlans);persist(updatedPlans);
                };
                const dvUndo=()=>{
                  if(!dvUndoStack.length)return;const entry=dvUndoStack[dvUndoStack.length-1];
                  setDvUndoStack(prev=>prev.slice(0,-1));
                  setDvRedoStack(prev=>[...prev,entry]);
                  const cellEl=document.getElementById(`dv-cell-${dvSlug((() => {const p=savedPlans.find(pp=>pp.id===entry.planId);return p?.course||"";})())}-${entry.field}`);
                  if(cellEl)cellEl.innerHTML=entry.before;
                  const updatedPlans=savedPlans.map(p=>{
                    if(p.id!==entry.planId)return p;const np={...p,planData:{...p.planData}};const dd={...(np.planData[entry.day]||emptyDay())};
                    if(!dd.dvAnnotations)dd.dvAnnotations={};dd.dvAnnotations[entry.field]=entry.before;np.planData[entry.day]=dd;return np;
                  });
                  setSavedPlans(updatedPlans);persist(updatedPlans);
                };
                const dvRedo=()=>{
                  if(!dvRedoStack.length)return;const entry=dvRedoStack[dvRedoStack.length-1];
                  setDvRedoStack(prev=>prev.slice(0,-1));
                  setDvUndoStack(prev=>[...prev,entry]);
                  const cellEl=document.getElementById(`dv-cell-${dvSlug((() => {const p=savedPlans.find(pp=>pp.id===entry.planId);return p?.course||"";})())}-${entry.field}`);
                  if(cellEl)cellEl.innerHTML=entry.after;
                  const updatedPlans=savedPlans.map(p=>{
                    if(p.id!==entry.planId)return p;const np={...p,planData:{...p.planData}};const dd={...(np.planData[entry.day]||emptyDay())};
                    if(!dd.dvAnnotations)dd.dvAnnotations={};dd.dvAnnotations[entry.field]=entry.after;np.planData[entry.day]=dd;return np;
                  });
                  setSavedPlans(updatedPlans);persist(updatedPlans);
                };
                const tocEntries=DAILY_ORDER.map(course=>{
                  const plan=planByCourse[course];const dd=plan?.planData?.[dailyViewDay];
                  const isCanceled=dd?.canceled!=null;
                  const visibleRows=(!plan||isCanceled)?[]:ROW_LABELS.filter(({key,composite,isSuggestion})=>{
                    if(composite){
                      if(key==="bellWork")return !!(dd?.bellWorkType||dd?.bellWorkText);
                      if(key==="anticipatorySet")return !!(dd?.anticipatorySelected?.[0]||dd?.anticipatoryText);
                      if(key==="guidedPractice")return !!(dd?.guidedPracticeType||dd?.guidedPracticeText);
                      if(key==="independentPractice")return !!(dd?.indPracticeType||dd?.indPracticeText);
                      if(key==="lesson")return !!(dd?.lessonType||dd?.lesson);
                      if(key==="conclusion")return !!(dd?.conclusionType||dd?.conclusionText);
                      if(key==="assessment"){const a=dd?.assessment||{};return !!((a.form&&a.form.length)||a.quizName);}
                    }
                    let val=dd?.[key]||"";if(Array.isArray(val))val=val.join(", ");
                    if(!val&&isSuggestion)return false;return !!val;
                  });
                  return{course,isCanceled,noPlan:!plan,rows:visibleRows};
                });
                const tbBtn=(active,onClick,title,children,extra={})=>(<button onClick={onClick} title={title} style={{padding:"3px 9px",borderRadius:4,border:"none",background:active?T.accentBlue:"transparent",color:active?"#fff":T.text,cursor:"pointer",fontSize:16,fontWeight:"bold",transition:"all 150ms ease",...extra}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background=T.surface2||"#e8eaed";}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>{children}</button>);
                return(
                  <div>
                    {/* Sticky toolbar */}
                    <div ref={dvToolbarRef} style={{position:"sticky",top:0,zIndex:45,background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"9px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",transition:"padding-right 200ms ease"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"nowrap"}}>
                        {(()=>{const thisWeekT=getWeekStart(today).getTime();const nextWeekT=new Date(thisWeekT);nextWeekT.setDate(nextWeekT.getDate()+7);const nextWeekTime=nextWeekT.getTime();const getWeekColor=(t)=>t===thisWeekT?"#f97316":t===nextWeekTime?"#7c3aed":t<thisWeekT?"#3b82f6":"#16a34a";const selColor=getWeekColor(currentWeekStart.getTime());return(
                        <select value={currentWeekStart.getTime()} onChange={e=>{const ws=new Date(Number(e.target.value));ws.setHours(0,0,0,0);setDailyViewWeekStart(ws);}} style={{fontSize:16,padding:"5px 8px",borderRadius:4,border:`2px solid ${selColor}`,background:T.surface,color:selColor,cursor:"pointer",fontWeight:"bold",marginRight:4}}>
                          {(()=>{const weeks=[...new Set(savedPlans.filter(p=>!p.archived).map(p=>{const ws=getWeekStart(parseLocalDate(p.weekStart));return ws.getTime();}))].sort((a,b)=>a-b);const fmt=d=>`${d.getDate()} ${d.toLocaleDateString("en-US",{month:"short"}).slice(0,3)} ${String(d.getFullYear()).slice(-2)}`;return weeks.map(t=>{const ws=new Date(t);const monDate=new Date(ws);monDate.setDate(ws.getDate()+1);const friDate=new Date(ws);friDate.setDate(ws.getDate()+5);const color=getWeekColor(t);return <option key={t} value={t} style={{color,fontWeight:"bold"}}>{fmt(monDate)} – {fmt(friDate)}</option>;});})()}
                        </select>);})()}
                        <div style={{width:1,height:30,background:T.border,margin:"0 4px"}}/>
                        {(()=>{const todayWs=getWeekStart(today).getTime();const viewWs=currentWeekStart.getTime();const todayDow=today.getDay();const todayDayName=todayDow>=1&&todayDow<=5?DAYS[todayDow-1]:null;const isToday=todayWs===viewWs&&todayDayName===dailyViewDay;return(
                        <button onClick={()=>{const tw=getWeekStart(today);setDailyViewWeekStart(tw);if(todayDayName)setDailyViewDay(todayDayName);}} style={{padding:"3px 12px",borderRadius:6,border:"none",background:isToday?"#4b5563":"#9ca3af",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:isToday?"bold":"normal",marginRight:4,display:"flex",flexDirection:"column",alignItems:"center",gap:0,transition:"all 150ms ease"}} title="Jump to today" onMouseEnter={e=>{e.currentTarget.style.background=isToday?"#374151":"#6b7280";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.background=isToday?"#4b5563":"#9ca3af";e.currentTarget.style.transform="translateY(0)";}}><span>Today</span><span style={{fontSize:10,opacity:0.85,fontWeight:"normal"}}>{`${today.getDate()} ${today.toLocaleDateString("en-US",{month:"short"}).slice(0,3)} ${String(today.getFullYear()).slice(-2)}`}</span></button>);})()}
                        <div style={{width:1,height:30,background:T.border}}/>
                        {DAYS.map((d,di)=>{const isActive=dailyViewDay===d;const colBg=DAY_COL_BG[d];const hdrBg=DAY_HDR_BG[d];const borderC=DAY_BORDER[d];const dayDate=new Date(currentWeekStart);dayDate.setDate(currentWeekStart.getDate()+di+1);const dayDateStr=`${dayDate.getDate()} ${dayDate.toLocaleDateString("en-US",{month:"short"}).slice(0,3)} ${String(dayDate.getFullYear()).slice(-2)}`;return(
                          <button key={d} onClick={()=>setDailyViewDay(d)} style={{padding:"3px 10px",borderRadius:4,border:isActive?`2px solid ${borderC}`:`1px solid ${borderC}`,background:isActive?hdrBg:colBg,color:isActive?"#1e2a3a":T.text,fontWeight:isActive?"bold":"normal",cursor:"pointer",fontSize:14,transition:"all 150ms ease",display:"flex",flexDirection:"column",alignItems:"center",gap:0}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=hdrBg;e.currentTarget.style.opacity="0.85";}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background=colBg;e.currentTarget.style.opacity="1";}}><span>{d}</span><span style={{fontSize:10,opacity:0.75,fontWeight:"normal"}}>{dayDateStr}</span></button>
                        );})}
                        <div style={{width:1,height:30,background:T.border}}/>
                        <div style={{display:"flex",alignItems:"center",gap:6,background:T.surface2||"#e8eaed",borderRadius:8,padding:"6px 12px",minWidth:200}}>
                          <span style={{fontSize:16,color:T.textMuted}}>{"\ud83d\udd0e"}</span>
                          <input value={dvSearch} onChange={e=>{setDvSearch(e.target.value);setDvSearchIdx(0);}} placeholder="Search..." style={{border:"none",outline:"none",background:"transparent",flex:1,minWidth:80,fontSize:15,color:T.text}}/>
                          {dvSearch&&<>
                            <span style={{fontSize:13,color:T.textMuted,whiteSpace:"nowrap"}}>{dvSearchMatches.length?`${dvSearchIdx+1}/${dvSearchMatches.length}`:"0"}</span>
                            <button onClick={()=>setDvSearchIdx(i=>(i-1+dvSearchMatches.length)%dvSearchMatches.length)} disabled={dvSearchMatches.length===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"2px 6px",color:T.text}}>{"\u25c0"}</button>
                            <button onClick={()=>setDvSearchIdx(i=>(i+1)%dvSearchMatches.length)} disabled={dvSearchMatches.length===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"2px 6px",color:T.text}}>{"\u25b6"}</button>
                            <button onClick={()=>{setDvSearch("");setDvSearchMatches([]);setDvSearchIdx(0);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"2px 6px",color:T.error}}>{"\u2715"}</button>
                          </>}
                        </div>
                        <div style={{flex:1}}/>
                        {tbBtn(false,()=>setDailyViewTocOpen(p=>!p),dailyViewTocOpen?"Hide Outline":"Show Outline",dailyViewTocOpen?"\u2630 Hide":"\u2630 Show")}
                        <button onClick={()=>{setPrintPreviewHtml(buildDailyPrintHtml(dailyViewDay,plansThisWeek,currentWeekStart,settings));}} style={{padding:"3px 12px",borderRadius:4,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontSize:16,fontWeight:"bold",transition:"all 150ms ease"}} onMouseEnter={e=>{e.currentTarget.style.background="#15803d";}} onMouseLeave={e=>{e.currentTarget.style.background="#16a34a";}}>{"\ud83d\udda8\ufe0f"} Print</button>
                        <button onClick={()=>{const html=buildDailyPrintHtml(dailyViewDay,plansThisWeek,currentWeekStart,settings);exportPdfFromBlocks(html,`Daily-${dailyViewDay}-${displayDate.replace(/\s/g,"")}.pdf`,{header:`${dailyViewDay} ${displayDate}`,footer:`${settings.teacherName||"Dr. Derrick DeMars"} · ${settings.schoolName||"Innova Preparatory School"}, ${settings.location||"Hattiesburg, MS"}`});}} style={{padding:"3px 12px",borderRadius:4,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontSize:16,fontWeight:"bold",transition:"all 150ms ease"}} onMouseEnter={e=>{e.currentTarget.style.background="#b91c1c";}} onMouseLeave={e=>{e.currentTarget.style.background="#dc2626";}}>📄 PDF</button>
                        <button disabled={dvZipBusy} onClick={async()=>{
                          setDvZipBusy(true);
                          try{
                            const footer=`${settings.teacherName||"Dr. Derrick DeMars"} · ${settings.schoolName||"Innova Preparatory School"}, ${settings.location||"Hattiesburg, MS"}`;
                            const files=[];
                            for(const course of DAILY_ORDER){
                              const html=buildDailyPrintHtml(dailyViewDay,plansThisWeek,currentWeekStart,settings,{rows:DAILY_INDIVIDUAL_ROWS,courses:[course],textOnly:true});
                              const blob=await exportPdfFromBlocks(html,"",{returnBlob:true,header:`${dailyViewDay} ${displayDate}`,footer});
                              files.push({name:`${course.replace(/[^A-Za-z0-9]+/g,"-")}-${dailyViewDay}-${displayDate.replace(/\s/g,"")}.pdf`,data:new Uint8Array(await blob.arrayBuffer())});
                            }
                            const zip=makeZipBlob(files);
                            const url=URL.createObjectURL(zip);
                            const a=document.createElement("a");
                            a.href=url;a.download=`Daily-Individual-${dailyViewDay}-${displayDate.replace(/\s/g,"")}.zip`;
                            document.body.appendChild(a);a.click();document.body.removeChild(a);
                            setTimeout(()=>URL.revokeObjectURL(url),1000);
                          }catch(err){
                            setAppModal({type:"alert",icon:"⚠️",title:"Individual PDF Failed",warning:err.message||"Could not build the zip."});
                          }finally{setDvZipBusy(false);}
                        }} style={{padding:"3px 12px",borderRadius:4,border:"none",background:dvZipBusy?"#9ca3af":"#7c3aed",color:"#fff",cursor:dvZipBusy?"default":"pointer",fontSize:16,fontWeight:"bold",transition:"all 150ms ease"}} onMouseEnter={e=>{if(!dvZipBusy)e.currentTarget.style.background="#6d28d9";}} onMouseLeave={e=>{if(!dvZipBusy)e.currentTarget.style.background="#7c3aed";}}>{dvZipBusy?"⏳ Building…":"🗂️ Individual PDF"}</button>
                      </div>
                    </div>
                    {/* Content + outline */}
                    <div style={{display:"flex",padding:"12px 16px 24px"}}>
                      <div style={{flex:1,minWidth:0,marginRight:dailyViewTocOpen?195:0,transition:"margin-right 200ms ease"}}>
                        {DAILY_ORDER.map((course,ci)=>{
                          const plan=planByCourse[course];
                          const cc=COURSE_COLORS[course]||{bg:"#6b7280",light:"#f9fafb",border:"#d1d5db",text:"#374151"};
                          const dayData=plan?.planData?.[dailyViewDay];
                          const isCanceled=dayData?.canceled!=null;
                          const cSlug=dvSlug(course);
                          return(
                            <div key={course} id={`dv-${cSlug}`} style={{background:T.surface,border:`1px solid ${cc.border||T.border}`,borderLeft:`5px solid ${cc.bg}`,borderRadius:10,padding:"16px 20px",marginBottom:16}}>
                              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                                <span style={{background:cc.bg,color:"#fff",borderRadius:6,padding:"4px 12px",fontSize:16,fontWeight:"bold"}}>{course}</span>
                                {isCanceled&&<span style={{background:"#fef2f2",color:"#dc2626",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:"bold",border:"1px solid #fca5a5"}}>{"\u274c"} {dayData.canceled.reason||"Canceled"}</span>}
                                {!plan&&<span style={{color:T.textMuted,fontSize:13,fontStyle:"italic"}}>No plan for this week</span>}
                              </div>
                              {isCanceled?(
                                <div style={{padding:20,textAlign:"center",color:T.textMuted,fontSize:14}}>No classes — {dayData.canceled.reason||"Canceled"}{dayData.canceled.isHoliday?" (School Holiday)":""}</div>
                              ):!plan?(
                                <div style={{padding:20,textAlign:"center",color:T.textMuted,fontSize:14}}>No lesson plan created for this week.</div>
                              ):(
                                <table style={{width:"100%",borderCollapse:"collapse",fontSize:16}}>
                                  <tbody>
                                    {ROW_LABELS.map(({key,label,composite,isSuggestion})=>{
                                      let val="";
                                      if(composite){
                                        const nl=t=>(t||"").replace(/\n/g,"<br>");
                                        if(key==="bellWork"){const tp=dayData?.bellWorkType||"";const tx=dayData?.bellWorkText||"";val=tp?(tp+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="anticipatorySet"){const sel=dayData?.anticipatorySelected;const tp=sel&&sel.length?sel.join(", "):"";const tx=dayData?.anticipatoryText||"";val=tp?(tp+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="guidedPractice"){const tp=dayData?.guidedPracticeType||"";const lb=dayData?.guidedPracticeLabel||"";const tx=dayData?.guidedPracticeText||"";const hdr=tp?(tp+(lb?": "+lb:"")):"";val=hdr?(hdr+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="independentPractice"){const tp=dayData?.indPracticeType||"";const tx=dayData?.indPracticeText||"";val=tp?(tp+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="lesson"){const tp=dayData?.lessonType||"";const tx=dayData?.lesson||"";val=tp?(tp+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="conclusion"){const tp=dayData?.conclusionType||"";const tx=dayData?.conclusionText||"";val=tp?(tp+(tx?"<br>"+nl(tx):"")):(tx?nl(tx):"");}
                                        else if(key==="hmw"){const h=(dayData?.hmwSelected||["None"]).join(", ");const tx=dayData?.hmwText||"";val=h+(tx?"<br>"+nl(tx):"");}
                                        else if(key==="assessment"){const a=dayData?.assessment||{};const form=(a.form||[]).concat(a.formOthers||[]).join(", ");const summ=a.quizName?(a.quizName+(a.quizDate?" ("+a.quizDate+")":"")):"";val=form?(form+(summ?"<br>Summative: "+summ:"")):(summ?"Summative: "+summ:"");}
                                        if(!val)return null;
                                      }else{
                                        val=dayData?.[key]||"";
                                        if(Array.isArray(val))val=val.join(", ");
                                        if(!val&&isSuggestion)return null;
                                        val=escapeHtml(val);
                                      }
                                      let cellHtml=hasMdFormatting(composite?val:dayData?.[key]||"")?mdToHtml((composite?val:val).replace(/\n/g,"<br/>")):(composite?val:val)||`<span style="color:${T.textMuted};font-style:italic;">\u2014</span>`;
                                      const cellId=`dv-cell-${cSlug}-${key}`;const isSearchHit=dvSearchMatches.some(m=>m.cellId===cellId);const isActiveHit=dvSearchMatches[dvSearchIdx]&&dvSearchMatches[dvSearchIdx].cellId===cellId;
                                      if(dvSearch.length>=3&&isSearchHit){const q=dvSearch.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const re=new RegExp(`(${q})`,"gi");const activeClass=isActiveHit?'dv-hit-active':'dv-hit';cellHtml=cellHtml.replace(/(<[^>]+>)|([^<]+)/g,(m,tag,text)=>tag||text.replace(re,`<span class="${activeClass}">$1</span>`));}
                                      return(
                                        <tr key={key} id={`dv-${cSlug}-${key}`}>
                                          <td style={{padding:"6px 10px",fontWeight:"bold",color:T.textMuted,verticalAlign:"top",width:180,borderBottom:`1px solid ${T.border}`,fontSize:18}}>{label}</td>
                                          <td style={{padding:"6px 10px",color:T.text,borderBottom:`1px solid ${T.border}`,lineHeight:1.5,fontWeight:key==="lessonTitle"?"bold":"normal"}}>
                                            <div
                                              id={cellId}
                                              key={`${dailyViewDay}-${key}`}
                                              dangerouslySetInnerHTML={{__html:cellHtml}}
                                              style={{minHeight:20}}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {dailyViewTocOpen&&(
                        <div style={{position:"fixed",right:0,top:(dvToolbarBottom||0)+40,bottom:0,width:185,overflowY:"auto",background:T.surface,borderLeft:`1px solid ${T.border}`,padding:"10px 0",boxShadow:"-2px 0 8px rgba(0,0,0,0.04)",zIndex:50,fontSize:14}}>
                          <div style={{padding:"4px 12px 8px",fontWeight:"bold",fontSize:14,color:T.textMuted,borderBottom:`1px solid ${T.border}`,letterSpacing:"0.5px",textTransform:"uppercase"}}>Outline</div>
                          {tocEntries.map(({course,isCanceled,noPlan,rows})=>{
                            const cSlug=dvSlug(course);const cc=COURSE_COLORS[course]||{bg:"#6b7280"};
                            const isCourseActive=dvActiveId.startsWith(`dv-${cSlug}`);
                            return(
                              <div key={course} style={{padding:"3px 0"}}>
                                <div onClick={()=>scrollToEl(`dv-${cSlug}`)} style={{padding:"4px 12px",cursor:"pointer",fontWeight:"bold",fontSize:14,color:isCourseActive?cc.bg:T.text,background:dvActiveId===`dv-${cSlug}`?(cc.light||"#f0f0f0"):"transparent",borderLeft:isCourseActive?`3px solid ${cc.bg}`:"3px solid transparent",transition:"all 150ms ease"}} onMouseEnter={e=>{e.currentTarget.style.background=cc.light||"#f5f5f5";}} onMouseLeave={e=>{e.currentTarget.style.background=dvActiveId===`dv-${cSlug}`?(cc.light||"#f0f0f0"):"transparent";}}>
                                  <span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:cc.bg,marginRight:6,verticalAlign:"middle"}}></span>{course}{(isCanceled||noPlan)&&<span style={{color:T.textMuted,fontWeight:"normal"}}> —</span>}
                                </div>
                                {!isCanceled&&!noPlan&&rows.map(({key,label})=>{
                                  const rowId=`dv-${cSlug}-${key}`;const isRowActive=dvActiveId===rowId;
                                  return(
                                    <div key={key} onClick={()=>scrollToEl(rowId)} style={{padding:"2px 12px 2px 26px",cursor:"pointer",fontSize:13,color:isRowActive?cc.bg:T.textMuted,background:isRowActive?(cc.light||"#f0f0f0"):"transparent",borderLeft:isRowActive?`3px solid ${cc.bg}`:"3px solid transparent",transition:"all 150ms ease",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} onMouseEnter={e=>{e.currentTarget.style.background=cc.light||"#f5f5f5";}} onMouseLeave={e=>{e.currentTarget.style.background=isRowActive?(cc.light||"#f0f0f0"):"transparent";}}>
                                      {label}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ):activeTab==="timeline"?(
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:16}}>{"\ud83d\udcc5"} Multi-Week Timeline</div>
              {savedPlans.length===0?<div style={{padding:40,textAlign:"center",color:T.textMuted}}>Create plans to see the timeline.</div>:(()=>{
                const weeks=[];const baseWeek=getWeekStart(today);
                for(let i=-4;i<=8;i++){const w=new Date(baseWeek);w.setDate(w.getDate()+i*7);weeks.push(weekToISO(w));}
                const planMap={};COURSES.forEach(c=>{planMap[c]={};});
                savedPlans.forEach(p=>{if(planMap[p.course])planMap[p.course][p.weekStart]=p;});
                const curWeekISO=weekToISO(getWeekStart(today));
                return(
                  <div style={{overflowX:"auto"}}>
                    <table style={{borderCollapse:"separate",borderSpacing:3,minWidth:1200}}>
                      <thead><tr>
                        <th style={{background:"#334155",color:"#fff",padding:8,borderRadius:6,fontSize:13,width:140,textAlign:"left"}}>Course</th>
                        {weeks.map(wISO=>{const d=parseLocalDate(wISO);const wd=getWeekDates(d);const isCur=curWeekISO===wISO;return(
                          <th key={wISO} style={{background:isCur?"#f97316":"#334155",color:"#fff",padding:"6px 4px",borderRadius:6,fontSize:11,textAlign:"center",minWidth:90}}>
                            {formatDate(wd[0])}<br/>{formatDate(wd[4])}
                          </th>
                        );})}
                      </tr></thead>
                      <tbody>
                        {COURSES.map(course=>{const cc=COURSE_COLORS[course]||{bg:"#6b7280",light:"#f9fafb",border:"#d1d5db",text:"#374151"};return(
                          <tr key={course}>
                            <td style={{background:cc.bg,color:"#fff",fontWeight:"bold",padding:8,borderRadius:6,fontSize:13}}>{course}</td>
                            {weeks.map(wISO=>{
                              const plan=planMap[course]?.[wISO];
                              const hasH=DAYS.some(d=>schoolHolidays.includes(getDayISO(wISO,d)));
                              return(
                                <td key={wISO} onClick={()=>{if(plan){setPrevTab(activeTab);setActiveTab("plans");setEditingId(plan.id);lastOpenedPlanId.current=plan.id;}}} style={{background:plan?(plan.completed?"#dcfce7":cc.light):(hasH?"#fef3c7":"#f9fafb"),border:`1px solid ${plan?cc.border:T.border}`,borderRadius:6,padding:"6px 4px",cursor:plan?"pointer":"default",textAlign:"center",fontSize:12}}>
                                  {plan?(<div><div style={{fontWeight:"bold",color:cc.text}}>{plan.termWeek||"Plan"}</div>{plan.completed&&<span style={{color:"#16a34a"}}>{"\u2713"}</span>}</div>):(hasH?<span style={{color:"#d97706"}}>{"\ud83c\udfd6\ufe0f"}</span>:<span style={{color:"#d1d5db"}}>{"\u2014"}</span>)}
                                </td>
                              );
                            })}
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          ):activeTab==="pacingHistory"?(
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:16}}>{"\u23f3"} Pacing History</div>
              <div style={{display:"flex",gap:4,borderBottom:`2px solid ${T.border}`,marginBottom:20}}>
                {["2025-2026","2026-2027"].map(y=>{const isActive=pacingHistoryYear===y;return(
                  <button key={y} onClick={()=>setPacingHistoryYear(y)} style={{padding:"10px 24px",border:"none",borderBottom:isActive?`3px solid ${T.accent}`:"3px solid transparent",marginBottom:-2,background:"transparent",color:isActive?T.accent:T.textMuted,fontWeight:isActive?"bold":"normal",cursor:"pointer",fontSize:15,transition:"all 150ms ease"}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.color=T.text;}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.color=T.textMuted;}}>{y}</button>
                );})}
              </div>
              <div style={{display:"flex",gap:16}}>
                <div style={{width:220,flexShrink:0,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:8}}>
                  <div style={{fontSize:11,fontWeight:"bold",color:T.textMuted,textTransform:"uppercase",padding:"6px 10px 8px",letterSpacing:"0.5px"}}>Courses</div>
                  {(PACING_YEAR_COURSES[pacingHistoryYear]||[]).map(course=>{const isActive=pacingCourseByYear[pacingHistoryYear]===course;const cc=COURSE_COLORS[course]||{bg:"#6b7280",light:"#f9fafb"};return(
                    <div key={course} onClick={()=>setPacingCourseByYear(prev=>({...prev,[pacingHistoryYear]:course}))} style={{padding:"8px 12px",borderRadius:6,cursor:"pointer",fontSize:14,fontWeight:isActive?"bold":"normal",color:isActive?cc.bg:T.text,background:isActive?(cc.light||"#f0f0f0"):"transparent",borderLeft:isActive?`3px solid ${cc.bg}`:"3px solid transparent",marginBottom:2,transition:"all 150ms ease"}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=T.surface2||"#e8eaed";}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                      <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:cc.bg,marginRight:8,verticalAlign:"middle"}}/>{course}
                    </div>
                  );})}
                </div>
                <div style={{flex:1,padding:40,textAlign:"center",color:T.textMuted,background:T.surface,border:`1px dashed ${T.border}`,borderRadius:8}}>
                  <div style={{fontSize:15,marginBottom:8}}>Pacing History for <strong style={{color:T.text}}>{pacingCourseByYear[pacingHistoryYear]||"—"}</strong> ({pacingHistoryYear})</div>
                  <div style={{fontSize:13}}>Features will be added here soon.</div>
                </div>
              </div>
            </div>
          ):activeTab==="progress"?(
            <div style={{padding:"16px 24px 8px",display:"flex",flexDirection:"column",height:"calc(100vh - 132px)",maxHeight:"calc(100vh - 132px)",overflow:"hidden"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:8}}>{"\ud83d\udcc8"} Progress</div>
              <div style={{display:"flex",gap:12,marginBottom:16,fontSize:12,color:T.textMuted}}>
                <span><span style={{display:"inline-block",width:14,height:14,background:"#fecaca",borderRadius:3,verticalAlign:"middle",marginRight:4}}/>&lt;25%</span>
                <span><span style={{display:"inline-block",width:14,height:14,background:"#fed7aa",borderRadius:3,verticalAlign:"middle",marginRight:4}}/>25-50%</span>
                <span><span style={{display:"inline-block",width:14,height:14,background:"#fef08a",borderRadius:3,verticalAlign:"middle",marginRight:4}}/>50-75%</span>
                <span><span style={{display:"inline-block",width:14,height:14,background:"#bbf7d0",borderRadius:3,verticalAlign:"middle",marginRight:4}}/>75%+</span>
                <span><span style={{display:"inline-block",width:14,height:14,background:"#e5e7eb",borderRadius:3,verticalAlign:"middle",marginRight:4}}/>No plan</span>
              </div>
              {savedPlans.length===0?<div style={{padding:40,textAlign:"center",color:T.textMuted}}>Create plans to see the progress table.</div>:(()=>{
                const activePlans=savedPlans.filter(p=>!p.archived);
                const baseWeek=getWeekStart(today);
                const curWeekISO=weekToISO(baseWeek);
                const allWeekStarts=activePlans.map(p=>p.weekStart).filter(Boolean);
                let maxWeek=weekToISO(new Date(baseWeek.getTime()+8*7*86400000));
                allWeekStarts.forEach(ws=>{if(ws>maxWeek)maxWeek=ws;});
                const weeks=[];let w=new Date(baseWeek);const end=parseLocalDate(maxWeek);
                while(w<=end){weeks.push(weekToISO(w));w=new Date(w);w.setDate(w.getDate()+7);}
                const planMap={};COURSES.forEach(c=>{planMap[c]={};});
                activePlans.forEach(p=>{if(planMap[p.course]){if(!planMap[p.course][p.weekStart])planMap[p.course][p.weekStart]=[];planMap[p.course][p.weekStart].push(p);}});
                const sortPlans=(arr)=>[...arr].sort((a,b)=>Number(a.id.split("-")[0])-Number(b.id.split("-")[0]));
                const stickyTd={position:"sticky",left:0,zIndex:2,boxShadow:"2px 0 4px rgba(0,0,0,0.1)",borderRight:`2px solid ${T.border}`};
                const showTip=(e,p)=>{clearTimeout(ptTooltipTimer.current);const rect=e.currentTarget.getBoundingClientRect();ptTooltipTimer.current=setTimeout(()=>setPtTooltip({planId:p.id,rect,created:p.createdAt,edited:p.updatedAt}),300);};
                const hideTip=()=>{clearTimeout(ptTooltipTimer.current);setPtTooltip(null);};
                const openPicker=(plans,course)=>{
                  const opts=plans.map(p=>{const pc=Math.round(calcPlanCompletion(p.planData)*100);return{label:`${p.name}${p.completed?" \u2713":""}`,sublabel:`${pc}% complete${p.term?" \u00b7 "+p.term:""}${p.termWeek?" "+p.termWeek:""}\nCreated: ${p.createdAt||"Unknown"}${p.updatedAt?"\nLast edited: "+p.updatedAt:""}`,bg:T.surface,color:T.text,border:T.border,action:()=>setGapDetailPlan(p)};});
                  setAppModal({type:"select",icon:"\ud83d\udcdd",title:"Select a Plan",message:`${plans.length} plans for ${course}:`,options:opts});
                };
                const renderCell=(plans,course,wISO)=>{
                  if(!plans||plans.length===0){
                    return(
                      <td key={wISO} onClick={()=>{const wDate=parseLocalDate(wISO);setAppModal({type:"confirm",icon:"\ud83d\udccb",title:"Create New Lesson Plan?",message:`Course: ${course}\nWeek of: ${formatDate(getWeekDates(parseLocalDate(wISO))[0])}\n\nThis will create a blank plan.`,confirmLabel:"Create",onConfirm:()=>{createPlanForWeek(course,wISO);}});}} style={{border:`2px dashed ${T.border}`,borderRadius:6,padding:"6px 4px",textAlign:"center",cursor:"pointer",background:"transparent",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent||"#2563eb";e.currentTarget.style.background=T.surface;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background="transparent";}}>
                        <span style={{fontSize:16,color:T.textMuted}}>+</span>
                      </td>
                    );
                  }
                  const sorted=sortPlans(plans);
                  const visible=sorted.length<=4?sorted:sorted.slice(0,4);
                  const overflow=sorted.length>4?sorted.length-4:0;
                  return(
                    <td key={wISO} style={{padding:0,borderRadius:6,overflow:"hidden",border:`1px solid ${T.border}`,height:"100%"}}>
                      <div style={{display:"flex",minHeight:44,height:"100%"}}>
                        {visible.map((p,i)=>{
                          const pct=calcPlanCompletion(p.planData);const pctStr=Math.round(pct*100)+"%";
                          const isCmp=p.completed;
                          return(
                            <div key={p.id} onClick={()=>sorted.length===1?setGapDetailPlan(p):openPicker(sorted,course)} onMouseEnter={(e)=>showTip(e,p)} onMouseLeave={hideTip} style={{flex:1,padding:"4px 2px",cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:"bold",background:isCmp?"#dcfce7":heatColor(pct),color:isCmp?"#15803d":"#374151",borderRight:i<visible.length-1?`1px solid ${T.border}`:"none",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                              {isCmp?<div><div style={{fontSize:10}}>{"\u2713"}</div><div style={{fontSize:9,fontWeight:"normal"}}>Done</div></div>:<div>{pctStr}</div>}
                            </div>
                          );
                        })}
                        {overflow>0&&<div style={{flex:"0 0 20px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T.textMuted,background:T.surface,cursor:"pointer",borderLeft:`1px solid ${T.border}`}} onClick={()=>openPicker(sorted,course)}>+{overflow}</div>}
                      </div>
                    </td>
                  );
                };
                return(<>
                  <div ref={ptScrollRef} className="pt-scroll-container" style={{overflowX:"auto",flex:1,minHeight:0}} onScroll={()=>{hideTip();updatePtScroll();}}>
                    <table style={{borderCollapse:"separate",borderSpacing:3,minWidth:1200,height:"100%"}}>
                      <thead><tr>
                        <th style={{...stickyTd,background:"#334155",color:"#fff",padding:8,borderRadius:6,fontSize:14,width:140,textAlign:"left",opacity:0.85,}}>Course</th>
                        {weeks.map(wISO=>{const d=parseLocalDate(wISO);const wd=getWeekDates(d);const isCur=curWeekISO===wISO;return(
                          <th key={wISO} {...(isCur?{"data-current-week":"true"}:{})} style={{background:isCur?"#f97316":"#334155",color:"#fff",padding:"6px 4px",borderRadius:6,fontSize:14,textAlign:"center",minWidth:90}}>
                            {formatDate(wd[0])}<br/>{formatDate(wd[4])}
                          </th>
                        );})}
                      </tr></thead>
                      <tbody>
                        {COURSES.map(course=>{const cc=COURSE_COLORS[course]||{bg:"#6b7280"};const rowH=`max(40px, calc((100vh - 310px) / ${COURSES.length}))`;return(
                          <tr key={course}>
                            <td style={{...stickyTd,background:cc.bg,color:"#fff",fontWeight:"bold",padding:8,borderRadius:6,fontSize:14,height:rowH,opacity:0.85,}}>{course}</td>
                            {weeks.map(wISO=>renderCell(planMap[course]?.[wISO],course,wISO))}
                          </tr>
                        );})}
                      </tbody>
                    </table>
                    {ptTooltip&&(()=>{const{rect,created,edited}=ptTooltip;const tw=180,arw=6;let left=rect.left+rect.width/2-tw/2;let top=rect.top-arw-4;let flipped=false;if(left<8)left=8;if(left+tw>window.innerWidth-8)left=window.innerWidth-tw-8;if(top<52){top=rect.bottom+arw+4;flipped=true;}return(
                      <div style={{position:"fixed",left,top,zIndex:9999,pointerEvents:"none",display:"flex",flexDirection:"column",alignItems:"center",transform:flipped?"none":"translateY(-100%)"}}>
                        {flipped&&<div style={{width:0,height:0,borderLeft:`${arw}px solid transparent`,borderRight:`${arw}px solid transparent`,borderBottom:`${arw}px solid ${T.border}`}}/>}
                        {flipped&&<div style={{width:0,height:0,borderLeft:`${arw}px solid transparent`,borderRight:`${arw}px solid transparent`,borderBottom:`${arw}px solid ${T.surface}`,marginTop:-arw+1,position:"relative",zIndex:1}}/>}
                        <div style={{background:T.surface,color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",fontSize:11,lineHeight:1.4,boxShadow:"0 2px 8px rgba(0,0,0,0.15)",width:tw,marginTop:flipped?-1:0,marginBottom:flipped?0:-1}}>
                          <div style={{color:T.textMuted,fontSize:10}}>Created: {created||"Unknown"}</div>
                          <div style={{color:T.textMuted,fontSize:10}}>{edited?"Last edited: "+edited:"Not yet edited"}</div>
                        </div>
                        {!flipped&&<div style={{width:0,height:0,borderLeft:`${arw}px solid transparent`,borderRight:`${arw}px solid transparent`,borderTop:`${arw}px solid ${T.surface}`,marginTop:-1,position:"relative",zIndex:1}}/>}
                        {!flipped&&<div style={{width:0,height:0,borderLeft:`${arw}px solid transparent`,borderRight:`${arw}px solid transparent`,borderTop:`${arw}px solid ${T.border}`,marginTop:-arw+1}}/>}
                      </div>
                    );})()}
                  </div>
                  {ptScrollInfo.show&&<div style={{height:18,marginTop:4,paddingLeft:4,paddingRight:4,flexShrink:0}}>
                    <div style={{position:"relative",height:12,background:T.surface2,borderRadius:6,cursor:"pointer"}} onClick={e=>{const el=ptScrollRef.current;if(!el)return;const r=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-r.left)/r.width;el.scrollLeft=ratio*(el.scrollWidth-el.clientWidth);}}>
                      <div className="pt-scroll-thumb" style={{position:"absolute",top:1,left:ptScrollInfo.left,width:ptScrollInfo.width,height:10,background:settings.darkMode?"#555":"#a0aab4",borderRadius:5,cursor:"pointer",transition:"box-shadow 0.2s"}} onMouseDown={e=>{e.preventDefault();e.stopPropagation();const startX=e.clientX,startL=ptScrollInfo.left,el=ptScrollRef.current;if(!el)return;const{scrollWidth,clientWidth}=el;const tW=ptScrollInfo.trackW,thW=ptScrollInfo.width,maxL=tW-thW,maxS=scrollWidth-clientWidth;const onMove=ev=>{const dx=ev.clientX-startX;const nL=Math.max(0,Math.min(maxL,startL+dx));el.scrollLeft=maxS>0?(nL/maxL)*maxS:0;};const onUp=()=>{document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);};document.addEventListener("mousemove",onMove);document.addEventListener("mouseup",onUp);}}/>
                    </div>
                  </div>}
                </>);
              })()}
            </div>
          ):(
            <div style={{padding:"8px 24px 8px",display:"flex",flexDirection:"column",position:"absolute",top:0,left:0,right:0,bottom:0,boxSizing:"border-box"}}>
              <div style={{display:"flex",gap:4,borderBottom:`2px solid ${T.border}`,marginBottom:12,flexShrink:0}}>
                {["2025-2026","2026-2027"].map(y=>{const isActive=pacingGuideYear===y;return(
                  <button key={y} onClick={()=>setPacingGuideYear(y)} style={{padding:"10px 24px",border:"none",borderBottom:isActive?`3px solid ${T.accent}`:"3px solid transparent",marginBottom:-2,background:"transparent",color:isActive?T.accent:T.textMuted,fontWeight:isActive?"bold":"normal",cursor:"pointer",fontSize:15,transition:"all 150ms ease"}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.color=T.text;}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.color=T.textMuted;}}>{y}</button>
                );})}
              </div>
              <style>{`@keyframes pacing-row-squeeze{0%{transform:scale(1);}50%{transform:scale(0.98);}100%{transform:scale(1);}}
.pacing-tb-btn:not(:disabled):hover{filter:brightness(1.1);box-shadow:0 0 8px 2px var(--btn-glow,rgba(255,255,255,0.3));}
.pacing-tb-btn:not(:disabled):active{transform:scale(0.96);box-shadow:0 0 12px 3px var(--btn-glow,rgba(255,255,255,0.5));}
.pacing-tb-btn:disabled{cursor:default;}
.pacing-tb-select:not(:disabled):hover{filter:brightness(1.05);box-shadow:0 0 6px 1px rgba(13,148,136,0.4);}
mark.pacing-match{background:#fef08a;color:inherit;border-radius:2px;}
mark.pacing-match-current{background:#facc15;color:inherit;outline:2px solid #f97316;border-radius:2px;}`}</style>
              <div style={{display:"flex",gap:16,flex:1,minHeight:0}}>
                <div style={{width:185,flexShrink:0,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:8,overflowY:"auto"}}>
                  <div style={{fontSize:11,fontWeight:"bold",color:T.textMuted,textTransform:"uppercase",padding:"6px 10px 8px",letterSpacing:"0.5px"}}>Courses</div>
                  {(PACING_YEAR_COURSES[pacingGuideYear]||[]).map(course=>{const isActive=pacingCourseByYear[pacingGuideYear]===course;const cc=COURSE_COLORS[course]||{bg:"#6b7280",light:"#f9fafb"};return(
                    <div key={course} onClick={()=>setPacingCourseByYear(prev=>({...prev,[pacingGuideYear]:course}))} style={{padding:"8px 12px",borderRadius:6,cursor:"pointer",fontSize:14,fontWeight:isActive?"bold":"normal",color:isActive?cc.bg:T.text,background:isActive?(cc.light||"#f0f0f0"):"transparent",borderLeft:isActive?`3px solid ${cc.bg}`:"3px solid transparent",marginBottom:2,transition:"all 150ms ease"}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=T.surface2||"#e8eaed";}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                      <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:cc.bg,marginRight:8,verticalAlign:"middle"}}/>{course}
                    </div>
                  );})}
                </div>
                {(()=>{const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);const hasData=rows&&rows.length>0;const anySelected=pacingSelectedRows.size>0;const rowCount=rows.length;
                  const UNIT_COLORS=["rgba(223,234,255,0.4)","rgba(220,252,231,0.4)","rgba(250,232,255,0.4)","rgba(254,243,199,0.4)"];
                  const UNIT_COLORS_QUIZ=["rgba(191,219,254,0.6)","rgba(187,247,208,0.6)","rgba(245,208,254,0.6)","rgba(253,230,138,0.6)"];
                  const UNIT_BORDER_COLORS=["rgba(96,165,250,0.6)","rgba(74,222,128,0.6)","rgba(192,132,252,0.6)","rgba(251,191,36,0.6)"];
                  const unitByIdx=(()=>{const arr=new Array(rows.length).fill(0);const lastQuizInTerm={};rows.forEach((r,i)=>{const {term}=parseWeekLabel(r.week);if(!term)return;if((r.type||"Instruction")==="Quiz")lastQuizInTerm[term]=i;});let curTerm="",curUnit=1;rows.forEach((r,i)=>{const {term}=parseWeekLabel(r.week);if(term&&term!==curTerm){curTerm=term;curUnit=1;}const lastQ=lastQuizInTerm[term];arr[i]=(lastQ!==undefined&&i<=lastQ&&curUnit<=4)?curUnit:0;if((r.type||"Instruction")==="Quiz")curUnit++;});return arr;})();
                  const pushUndo=(prevRows)=>{setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(prevRows))}]);setPacingRedoStack([]);};
                  const commitRows=(next)=>{pushUndo(rows);setPacingRows(pacingGuideYear,curCourse,next);};
                  const doUndo=()=>{if(pacingUndoStack.length===0)return;const last=pacingUndoStack[pacingUndoStack.length-1];setPacingRedoStack(s=>[...s,{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingUndoStack(s=>s.slice(0,-1));setPacingRows(last.year,last.course,last.rows);};
                  const doRedo=()=>{if(pacingRedoStack.length===0)return;const last=pacingRedoStack[pacingRedoStack.length-1];setPacingUndoStack(s=>[...s,{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack(s=>s.slice(0,-1));setPacingRows(last.year,last.course,last.rows);};
                  const updateRow=(idx,field,value)=>{const next=[...rows];next[idx]={...next[idx],[field]:value};commitRows(next);};
                  const toggleRow=(idx,shiftKey)=>{const prev=pacingSelectedRows;const next=new Set(prev);const added=new Set();if(shiftKey&&prev.size>0){const last=Math.max(...prev);const start=Math.min(last,idx);const end=Math.max(last,idx);for(let i=start;i<=end;i++){if(!prev.has(i))added.add(i);next.add(i);}}else{if(prev.has(idx))next.delete(idx);else{next.add(idx);added.add(idx);}}setPacingSelectedRows(next);if(added.size>0){setPacingRecentlySelected(p=>{const n=new Set(p);added.forEach(i=>n.add(i));return n;});setTimeout(()=>{setPacingRecentlySelected(p=>{const n=new Set(p);added.forEach(i=>n.delete(i));return n;});},800);}};
                  const clearSelection=()=>setPacingSelectedRows(new Set());
                  const selectAllRows=()=>{const next=new Set();rows.forEach((r,i)=>{if(!r.mergedHidden)next.add(i);});setPacingSelectedRows(next);};
                  const visibleRowCount=rows.filter(r=>!r.mergedHidden).length;
                  const headerAllChecked=visibleRowCount>0&&pacingSelectedRows.size===visibleRowCount;
                  const headerSomeChecked=pacingSelectedRows.size>0&&!headerAllChecked;
                  const toggleHeaderAll=()=>{if(pacingSelectedRows.size>0)clearSelection();else selectAllRows();};
                  const openAddRowModal=()=>{let insertAt=rows.length;let prevRow=null;if(pacingSelectedRows.size===1){const sel=[...pacingSelectedRows][0];insertAt=sel+1;prevRow=rows[sel];}else if(rows.length>0){prevRow=rows[rows.length-1];}const suggestContinued=prevRow&&prevRow.lessonTopic?`${stripMdFormatting(prevRow.lessonTopic)} Continued`:"";setPacingAddRowModal({insertAt,prevRow,lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"Instruction",suggestContinued});};
                  const openEditMergedModal=()=>{if(pacingSelectedRows.size!==1)return;const idx=[...pacingSelectedRows][0];const row=rows[idx];if(!row.isMergedRange&&!row.mergedParent)return;const fields=[{key:"lessonTopic",label:"Lesson Topic"},{key:"centralFocus",label:"Central Focus"},{key:"learningObjectives",label:"Learning Objectives"},{key:"standards",label:"MSCCRS"}];const sources=[{idx,row}];const selections={};fields.forEach(f=>{selections[f.key]={includeIdx:new Set([idx]),customText:""};});setPacingMergeModal({sources,fields,selections,targetIdx:idx,dateRange:row.date||"",editMode:true});};
                  const openMergeModal=()=>{if(pacingSelectedRows.size<2)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);const sources=sorted.map(idx=>({idx,row:rows[idx]}));const fields=[{key:"lessonTopic",label:"Lesson Topic"},{key:"centralFocus",label:"Central Focus"},{key:"learningObjectives",label:"Learning Objectives"},{key:"standards",label:"MSCCRS"}];const selections={};fields.forEach(f=>{selections[f.key]={includeIdx:new Set(sorted),customText:""};});const firstDate=rows[sorted[0]]?.date||"";const lastDate=rows[sorted[sorted.length-1]]?.date||"";const dateRange=firstDate&&lastDate&&firstDate!==lastDate?`${firstDate} \u2013 ${lastDate}`:firstDate;setPacingMergeModal({sources,fields,selections,targetIdx:sorted[0],dateRange});};
                  const isLocked=r=>{const cfg=PACING_TYPE_CONFIG[r.type||"Instruction"];return cfg&&cfg.merged;};
                  const deleteSelected=()=>{if(pacingSelectedRows.size===0)return;const next=[...rows];pacingSelectedRows.forEach(idx=>{next[idx]={...next[idx],lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"Instruction",breakLabel:""};});commitRows(next);clearSelection();};
                  const swapSelectedRows=()=>{if(pacingSelectedRows.size<2)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);const lockedIdx=sorted.filter(i=>isLocked(rows[i]));if(lockedIdx.length>0){const lockedLabels=lockedIdx.map(i=>`${rows[i].date||"row "+(i+1)} (${rows[i].type})`).join(", ");setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Cannot Swap Locked Rows",message:`Swap cannot include merged/locked rows. The following selected row(s) are locked: ${lockedLabels}. Deselect them and try again.`});return;}const contentOf=r=>({lessonTopic:r.lessonTopic||"",centralFocus:r.centralFocus||"",learningObjectives:r.learningObjectives||"",standards:r.standards||"",type:r.type||"Instruction",breakLabel:r.breakLabel||""});const snapshots=sorted.map(i=>contentOf(rows[i]));const next=[...rows];sorted.forEach((idx,i)=>{const srcIdx=(i-1+sorted.length)%sorted.length;next[idx]={...next[idx],...snapshots[srcIdx]};});commitRows(next);};
                  const startDuplicate=()=>{if(pacingSelectedRows.size!==1)return;setPacingDuplicateMode(true);};
                  const placeDuplicate=(targetIdx)=>{if(!pacingDuplicateMode||pacingSelectedRows.size!==1)return;const sourceIdx=[...pacingSelectedRows][0];const source=rows[sourceIdx];const next=[...rows];next[targetIdx]={...next[targetIdx],lessonTopic:source.lessonTopic,centralFocus:source.centralFocus,learningObjectives:source.learningObjectives,standards:source.standards,type:source.type,breakLabel:source.breakLabel};commitRows(next);setPacingDuplicateMode(false);clearSelection();};
                  const applyTypeToSelected=(newType)=>{if(pacingSelectedRows.size===0)return;
                    if(newType==="No Class"){const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);const dateField=suggestPacingDateRange(rows,sorted);setPacingNoClassModal({rowIndices:sorted,category:"Break",name:"",dateField,merge:sorted.length>1,keepContent:false,dayCount:sorted.length});return;}
                    const cfg=PACING_TYPE_CONFIG[newType];const next=[...rows];pacingSelectedRows.forEach(idx=>{const r=next[idx];const otherFields=["centralFocus","learningObjectives","standards"];const stripped={};otherFields.forEach(f=>{stripped[f]=stripMdFormatting(r[f]||"");});const wrappedLesson=cfg.wrap(stripMdFormatting(r.lessonTopic||""));next[idx]={...r,type:newType,lessonTopic:wrappedLesson,...stripped};if(cfg.merged&&!r.breakLabel){next[idx].breakLabel=newType==="Field Trip"?"Field Trip":newType;}});commitRows(next);};
                  const autoTagRows=()=>{const detections=[];rows.forEach((r,idx)=>{const lt=(r.lessonTopic||"").trim();if(!lt)return;if(/^Quiz\b/i.test(lt))detections.push({idx,type:"Quiz",current:r.type,label:lt});else if(/^Exam\b/i.test(lt)||/^Exams?$/i.test(lt))detections.push({idx,type:"Exam",current:r.type,label:lt});else if(/^Review\b/i.test(lt))detections.push({idx,type:"Review",current:r.type,label:lt});else if(/^Benchmark\b/i.test(lt))detections.push({idx,type:"Benchmark",current:r.type,label:lt});else if(/^Writing Day\b|Writing Across the Curriculum/i.test(lt))detections.push({idx,type:"Writing Day",current:r.type,label:lt});});setPacingAutoTagModal({detections,enabled:new Set(detections.map((_,i)=>i))});};
                  const applyAutoTags=(detections,enabled)=>{const next=[...rows];detections.forEach((d,i)=>{if(!enabled.has(i))return;const cfg=PACING_TYPE_CONFIG[d.type];const r=next[d.idx];const fields=["lessonTopic","centralFocus","learningObjectives","standards"];const wrapped={};fields.forEach(f=>{wrapped[f]=cfg.wrap(stripMdFormatting(r[f]||""));});next[d.idx]={...r,type:d.type,...wrapped};});commitRows(next);setPacingAutoTagModal(null);};
                  const btnStyle={padding:"6px 8px",fontSize:12,fontWeight:"bold",fontFamily:"Tahoma,sans-serif",color:"#fff",border:"none",borderRadius:4,lineHeight:1,cursor:"pointer",transition:"transform 100ms ease, filter 150ms ease, box-shadow 150ms ease"};
                  const tbBtn=(bg,onClick,label,opts={})=>{const isDisabled=!!opts.disabled;return(<button className="pacing-tb-btn" onClick={onClick} disabled={isDisabled} title={opts.title} style={{...btnStyle,background:bg,"--btn-glow":bg,opacity:isDisabled?0.5:1,cursor:isDisabled?"default":"pointer",...(opts.style||{})}}>{label}</button>);};
                  const exportPacingJson=()=>{const payload={course:curCourse,year:pacingGuideYear,exportedAt:new Date().toISOString(),rows:rows.map(r=>({week:r.week||"",date:r.date||"",day:r.day||"",type:r.type||"Instruction",lessonTopic:r.lessonTopic||"",centralFocus:r.centralFocus||"",learningObjectives:r.learningObjectives||"",standards:r.standards||"",breakLabel:r.breakLabel||"",noClassCategory:r.noClassCategory||"",noClassName:r.noClassName||"",mergedParent:!!r.mergedParent,mergedHidden:!!r.mergedHidden,isMergedRange:!!r.isMergedRange,keepContent:!!r.keepContent}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`pacing-${(curCourse||"course").replace(/[^a-z0-9]+/gi,"-")}-${pacingGuideYear}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
                  const handleImportFile=(file)=>{if(!file)return;const reader=new FileReader();reader.onload=(e)=>{try{const parsed=JSON.parse(e.target.result);const importRows=Array.isArray(parsed)?parsed:(parsed.rows||[]);if(!Array.isArray(importRows)||importRows.length===0){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Empty or invalid file",message:"The selected JSON file does not contain any rows."});return;}setPacingImportModal({importRows,fileName:file.name,mode:"overwrite",mergeConflict:"importWins"});}catch(err){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Parse error",message:`Could not parse JSON: ${err.message}`});}};reader.readAsText(file);};
                  const triggerImport=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=(e)=>{if(e.target.files&&e.target.files[0])handleImportFile(e.target.files[0]);};input.click();};
                  // === Stubs wired up in later steps ===
                  const handleAddClick=()=>{
                    if(pacingSelectedRows.size<2){openAddRowModal();return;}
                    const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);
                    const contiguous=sorted.every((v,i)=>i===0||v===sorted[i-1]+1);
                    if(!contiguous){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Non-contiguous selection",message:"Add requires the selected rows to be consecutive. The selected rows have unselected rows between them. Deselect the gaps or select a contiguous range and try again."});return;}
                    const N=sorted.length;
                    const lastSelected=sorted[sorted.length-1];
                    const newRows=Array.from({length:N},()=>({week:"",date:"",day:"",type:"Instruction",lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",breakLabel:"",noClassCategory:"",noClassName:"",mergedParent:false,mergedHidden:false,isMergedRange:false,keepContent:false}));
                    const next=[...rows];
                    next.splice(lastSelected+1,0,...newRows);
                    commitRows(next);
                    setPacingSelectedRows(new Set(Array.from({length:N},(_,i)=>lastSelected+1+i)));
                  };
                  const openDeleteModal=()=>{if(pacingSelectedRows.size===0)return;setPacingDeleteModal({stage:"choose",indices:[...pacingSelectedRows].sort((a,b)=>a-b),clearFields:new Set()});};
                  const openEditModal=()=>{if(pacingSelectedRows.size===0)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);setPacingEditModal({indices:sorted,lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"",week:"",date:"",day:"",breakLabel:"",dirty:new Set()});};
                  const openShiftDatesModal=()=>{if(pacingSelectedRows.size===0)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);if(sorted.some(i=>isLocked(rows[i]))){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Locked rows in selection",message:"Shift Dates cannot include merged/locked rows. Deselect them and try again."});return;}setPacingShiftDatesModal({indices:sorted,direction:"down",distance:1,showTermWeekConfirm:false,termWeekEdits:{}});};
                  // === Search / Replace ===
                  const searchFields=["lessonTopic","centralFocus","learningObjectives","standards","type","breakLabel","noClassName"];
                  const computeMatches=()=>{if(!pacingSearchOpen||pacingSearchQuery.length<2)return[];const results=[];let flags="gi";let pattern;try{const escaped=pacingSearchQuery.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");pattern=pacingSearchWholeWord?new RegExp(`\\b${escaped}\\b`,flags):new RegExp(escaped,flags);}catch(e){return[];}rows.forEach((r,rowIdx)=>{if(r.mergedHidden)return;searchFields.forEach(field=>{const value=r[field]||"";if(!value)return;pattern.lastIndex=0;let match;while((match=pattern.exec(value))!==null){results.push({rowIdx,field,start:match.index,end:match.index+match[0].length,value:match[0]});if(match.index===pattern.lastIndex)pattern.lastIndex++;}});});return results;};
                  const searchMatches=computeMatches();
                  const totalMatches=searchMatches.length;
                  const safeCurrentIdx=totalMatches>0?Math.min(pacingSearchCurrentIdx,totalMatches-1):0;
                  const currentMatch=totalMatches>0?searchMatches[safeCurrentIdx]:null;
                  const scrollToRow=(rowIdx)=>{setTimeout(()=>{const el=document.querySelector(`tr[data-pacing-row-idx="${rowIdx}"]`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},10);};
                  const nextMatch=()=>{if(totalMatches===0)return;const ni=(safeCurrentIdx+1)%totalMatches;setPacingSearchCurrentIdx(ni);scrollToRow(searchMatches[ni].rowIdx);};
                  const prevMatch=()=>{if(totalMatches===0)return;const ni=(safeCurrentIdx-1+totalMatches)%totalMatches;setPacingSearchCurrentIdx(ni);scrollToRow(searchMatches[ni].rowIdx);};
                  const replaceCurrentMatch=()=>{if(!currentMatch)return;const{rowIdx,field,start,end}=currentMatch;const next=[...rows];const val=next[rowIdx][field]||"";next[rowIdx]={...next[rowIdx],[field]:val.slice(0,start)+pacingSearchReplace+val.slice(end)};commitRows(next);};
                  const replaceAllMatches=()=>{if(totalMatches===0)return;if(totalMatches>=5){const confirmed=window.confirm(`Replace ${totalMatches} match${totalMatches===1?"":"es"} across all searched fields?`);if(!confirmed)return;}const next=[...rows];const byRowField={};searchMatches.forEach(m=>{const key=`${m.rowIdx}|${m.field}`;if(!byRowField[key])byRowField[key]=[];byRowField[key].push(m);});Object.keys(byRowField).forEach(key=>{const[rowIdxStr,field]=key.split("|");const rowIdx=parseInt(rowIdxStr,10);const ms=byRowField[key].sort((a,b)=>b.start-a.start);let val=next[rowIdx][field]||"";ms.forEach(m=>{val=val.slice(0,m.start)+pacingSearchReplace+val.slice(m.end);});next[rowIdx]={...next[rowIdx],[field]:val};});commitRows(next);setPacingSearchCurrentIdx(0);};
                  const closeSearch=()=>{setPacingSearchOpen(false);setPacingSearchQuery("");setPacingSearchCurrentIdx(0);};
                  return(
                <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:0}}>
                  {(<>
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:"8px 8px 0 0",borderBottom:"none",flexWrap:"wrap"}}>
                      {/* Group 1: Add / Delete (lifecycle) */}
                      {tbBtn("#16a34a",handleAddClick,"Add",{title:pacingSelectedRows.size>=2?"Add N blank rows after selection (contiguous only)":pacingSelectedRows.size===1?"Add new row after selected":"Add new row at end"})}
                      {tbBtn("#dc2626",openDeleteModal,"Delete",{disabled:!anySelected,title:"Delete or clear selected rows"})}
                      <div style={{width:1,height:24,background:T.border}}/>
                      {/* Group 2: Edit / Merge (shape) */}
                      {tbBtn("#0891b2",openEditModal,"Edit",{disabled:!anySelected,title:"Edit selected rows (bulk) or unmerge merged ranges"})}
                      {tbBtn("#0891b2",openMergeModal,"Merge",{disabled:pacingSelectedRows.size<2,title:"Merge selected rows (2+)"})}
                      <div style={{width:1,height:24,background:T.border}}/>
                      {/* Group 3: Duplicate / Swap / Shift Dates (movement) */}
                      {tbBtn("#7c3aed",startDuplicate,pacingDuplicateMode?"Click target":"Duplicate",{disabled:pacingSelectedRows.size!==1,title:"Duplicate"})}
                      {tbBtn("#db2777",swapSelectedRows,"Swap",{disabled:pacingSelectedRows.size<2,title:pacingSelectedRows.size===2?"Swap the two selected rows":pacingSelectedRows.size>2?`Cyclic shift: rotate content of ${pacingSelectedRows.size} selected rows forward by one`:"Select 2 or more rows to swap"})}
                      {tbBtn("#ea580c",openShiftDatesModal,"Shift",{disabled:!anySelected||[...pacingSelectedRows].some(i=>isLocked(rows[i])),title:"Shift the date/day values on selected rows up or down"})}
                      <div style={{width:1,height:24,background:T.border}}/>
                      {/* Group 4: Copy / Paste (clipboard) */}
                      {tbBtn("#0d9488",()=>{if(pacingSelectedRows.size===0)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);const snap=sorted.map(i=>({lessonTopic:rows[i].lessonTopic||"",centralFocus:rows[i].centralFocus||"",learningObjectives:rows[i].learningObjectives||"",standards:rows[i].standards||"",type:rows[i].type||"Instruction"}));setPacingClipboard(snap);},"Copy",{disabled:!anySelected,title:"Copy selected row(s) content + type"})}
                      {tbBtn("#f59e0b",()=>{if(pacingClipboard.length===0||pacingSelectedRows.size===0)return;const sorted=[...pacingSelectedRows].sort((a,b)=>a-b);if(sorted.length!==pacingClipboard.length){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Paste count mismatch",message:`Clipboard has ${pacingClipboard.length} row(s) but ${sorted.length} row(s) are selected. Select exactly ${pacingClipboard.length} row(s) to paste.`});return;}const next=[...rows];sorted.forEach((idx,i)=>{next[idx]={...next[idx],...pacingClipboard[i]};});commitRows(next);},pacingClipboard.length>0?`Paste (${pacingClipboard.length})`:"Paste",{disabled:pacingClipboard.length===0||!anySelected,title:pacingClipboard.length>0?`Paste (${pacingClipboard.length} row(s) in clipboard)`:"Clipboard empty"})}
                      <div style={{width:1,height:24,background:T.border}}/>
                      {/* Group 5: Undo / Redo (history, icons kept) */}
                      {tbBtn("#6b7280",doUndo,"\u21a9 Undo",{disabled:pacingUndoStack.length===0,title:"Undo"})}
                      {tbBtn("#6b7280",doRedo,"\u21aa Redo",{disabled:pacingRedoStack.length===0,title:"Redo"})}
                      <div style={{width:1,height:24,background:T.border}}/>
                      {/* Group 6: Type / Auto-Tag / Search (table-wide tooling) */}
                      {(()=>{const selIdxs=[...pacingSelectedRows];const types=selIdxs.map(i=>rows[i]?.type||"Instruction");const allSame=types.length>0&&types.every(t=>t===types[0]);const displayValue=allSame?types[0]:"";return(
                      <select className="pacing-tb-select" value={displayValue} onChange={e=>{if(e.target.value){applyTypeToSelected(e.target.value);}}} disabled={!anySelected} style={{...btnStyle,background:T.surface,color:T.text,border:`1px solid ${T.border}`,padding:"5px 6px",opacity:anySelected?1:0.5,cursor:anySelected?"pointer":"default"}} title="Set row type">
                        <option value="">Type...</option>
                        {PACING_ROW_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>);})()}
                      {tbBtn("#475569",()=>setPacingSearchOpen(o=>!o),"Search",{title:"Find and replace within the pacing guide (Cmd+F)"})}
                      <div style={{flex:1}}/>
                      {/* Group 7: Import / Export / Tag (file I/O + tagging) */}
                      {tbBtn("#2563eb",triggerImport,"Import",{title:"Import rows from JSON file"})}
                      {tbBtn("#6366f1",exportPacingJson,"Export",{disabled:!hasData,title:hasData?"Export current table as JSON":"No data to export"})}
                      {tbBtn("#dc2626",()=>{const html=buildPacingPrintHtml(rows,curCourse,pacingGuideYear);exportPdfFromHtml(html,`Pacing-${(curCourse||"course").replace(/\s/g,"-")}-${pacingGuideYear}.pdf`,{orientation:"landscape",renderWidth:1400});},"PDF",{disabled:!hasData,title:hasData?"Export pacing guide as PDF":"No data to export"})}
                      {tbBtn("#0d9488",autoTagRows,"Tag",{disabled:!hasData,title:"Scan rows for Quiz/Review/Exam/Benchmark/Writing Day and auto-tag"})}
                      <span style={{fontSize:12,color:T.textMuted,marginLeft:8}}>{rowCount} rows</span>
                    </div>
                    {pacingSearchOpen&&(
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:T.surface2||"#f9fafb",borderLeft:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}`,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:T.textMuted,marginRight:4}}>Find:</span>
                      <input autoFocus value={pacingSearchQuery} onChange={e=>{setPacingSearchQuery(e.target.value);setPacingSearchCurrentIdx(0);}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();nextMatch();}else if(e.key==="Escape"){e.preventDefault();closeSearch();}}} placeholder="Find in table (2+ chars)" style={{fontSize:12,padding:"5px 8px",borderRadius:4,border:`1px solid ${T.border}`,background:T.surface,color:T.text,width:200,fontFamily:"Tahoma,sans-serif"}}/>
                      <span style={{fontSize:12,color:T.textMuted,marginLeft:4}}>Replace:</span>
                      <input value={pacingSearchReplace} onChange={e=>setPacingSearchReplace(e.target.value)} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();closeSearch();}}} placeholder="Replace with" style={{fontSize:12,padding:"5px 8px",borderRadius:4,border:`1px solid ${T.border}`,background:T.surface,color:T.text,width:180,fontFamily:"Tahoma,sans-serif"}}/>
                      <button onClick={()=>setPacingSearchWholeWord(w=>!w)} title="Whole word" style={{...btnStyle,background:pacingSearchWholeWord?"#0d9488":"#9ca3af","--btn-glow":pacingSearchWholeWord?"#0d9488":"#9ca3af",padding:"5px 8px"}} className="pacing-tb-btn">Ab|</button>
                      {tbBtn("#6b7280",prevMatch,"\u25c0 Back",{disabled:totalMatches===0,title:"Previous match"})}
                      {tbBtn("#6b7280",nextMatch,"Next \u25b6",{disabled:totalMatches===0,title:"Next match"})}
                      {tbBtn("#0891b2",replaceCurrentMatch,"Replace",{disabled:!currentMatch,title:"Replace current match"})}
                      {tbBtn("#dc2626",replaceAllMatches,"Replace All",{disabled:totalMatches===0,title:"Replace every match"})}
                      <span style={{fontSize:12,color:T.textMuted,marginLeft:8}}>{pacingSearchQuery.length<2?"":totalMatches===0?"No matches":`${safeCurrentIdx+1} of ${totalMatches}`}</span>
                    </div>
                    )}
                    {!hasData?(
                      <div onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="#e0f2fe";e.currentTarget.style.borderColor="#0284c7";}} onDragLeave={e=>{e.currentTarget.style.background=T.surface;e.currentTarget.style.borderColor=T.border;}} onDrop={e=>{e.preventDefault();e.currentTarget.style.background=T.surface;e.currentTarget.style.borderColor=T.border;const file=e.dataTransfer.files?.[0];if(file)handleImportFile(file);}} style={{flex:1,minHeight:0,background:T.surface,border:`2px dashed ${T.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,transition:"all 200ms ease"}}>
                        <div style={{fontSize:48,marginBottom:16}}>{"\ud83d\udcc4"}</div>
                        <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:6}}>No pacing data for {curCourse||"\u2014"} ({pacingGuideYear})</div>
                        <div style={{fontSize:13,color:T.textMuted,marginBottom:20,textAlign:"center",maxWidth:400}}>Drag a JSON file here or click the button below to import a pacing guide. You can also use the Import button in the toolbar.</div>
                        <button onClick={triggerImport} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:"bold",boxShadow:"0 2px 8px rgba(37,99,235,0.3)"}}>{"\u2b07\ufe0f"} Upload JSON File</button>
                      </div>
                    ):(
                    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"0 0 8px 8px",overflow:"auto",flex:1,minHeight:0}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                        <colgroup>
                          <col style={{width:40}}/>
                          <col style={{width:72}}/>
                          <col style={{width:115}}/>
                          <col/>
                          <col/>
                          <col/>
                          <col style={{width:92}}/>
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={{padding:"8px 6px",textAlign:"center",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}><div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><input type="checkbox" checked={headerAllChecked} ref={el=>{if(el)el.indeterminate=headerSomeChecked;}} onChange={toggleHeaderAll} title={headerAllChecked?"Deselect all":(headerSomeChecked?"Clear selection":"Select all")} style={{width:20,height:20,cursor:"pointer",accentColor:"#0d9488"}}/></div></th>
                            <th style={{padding:"8px 8px",textAlign:"center",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>Week</th>
                            <th style={{padding:"8px 8px",textAlign:"left",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>Day/Date</th>
                            <th style={{padding:"8px 8px",textAlign:"left",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>Lesson Topic</th>
                            <th style={{padding:"8px 8px",textAlign:"left",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>Central Focus</th>
                            <th style={{padding:"8px 8px",textAlign:"left",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>Learning Objectives</th>
                            <th style={{padding:"8px 8px",textAlign:"left",position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",zIndex:10,boxShadow:"0 2px 0 0 #1a1a1a",fontSize:15}}>MSCCRS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r,idx)=>{if(r.mergedHidden)return null;const isSelected=pacingSelectedRows.has(idx);const isOverflow=r.overflow;const rowType=r.type||"Instruction";const typeCfg=PACING_TYPE_CONFIG[rowType];const isMerged=typeCfg&&typeCfg.merged;const isWeekStart=idx===0||rows[idx-1].week!==r.week;const showWeek=isWeekStart&&r.week;const{term,weekNum}=parseWeekLabel(r.week);
                            let mergeSpan=1;if(r.mergedParent){let j=idx+1;while(j<rows.length&&rows[j].mergedHidden){mergeSpan++;j++;}}
                            const isFriday=r.day==="Fri";const nextIsMon=idx+1<rows.length&&rows[idx+1].day==="Mon";const prevIsFri=idx>0&&rows[idx-1].day==="Fri";const nextIsMerged=idx+1<rows.length&&PACING_TYPE_CONFIG[rows[idx+1].type||"Instruction"]?.merged;const prevIsMerged=idx>0&&PACING_TYPE_CONFIG[rows[idx-1].type||"Instruction"]?.merged;
                            const borderBottom=(isFriday&&nextIsMon)||isMerged||nextIsMerged?`1.3px solid #4b5563`:`1px solid ${T.border}`;
                            const borderTop=(prevIsMerged||(idx>0&&isMerged))?`1.3px solid #4b5563`:"none";
                            const unitNum=unitByIdx[idx];
                            const inUnit=unitNum>=1&&unitNum<=4;
                            const unitBorderColor=inUnit?UNIT_BORDER_COLORS[unitNum-1]:null;
                            const isQuizRow=rowType==="Quiz";
                            const unitColor=inUnit?((isQuizRow?UNIT_COLORS_QUIZ:UNIT_COLORS)[unitNum-1]):"transparent";
                            // Benchmark grouping
                            const isBench=rowType==="Benchmark";
                            const prevIsBench=idx>0&&(rows[idx-1].type==="Benchmark");
                            const nextIsBench=idx+1<rows.length&&(rows[idx+1].type==="Benchmark");
                            const benchTop=isBench&&!prevIsBench;
                            const benchBottom=isBench&&!nextIsBench;
                            // Red-box grouping (Exam + post-Q4 Review, separate kinds)
                            const isExam=rowType==="Exam";
                            const isPostQ4Review=rowType==="Review"&&!inUnit;
                            const redKind=isExam?"exam":(isPostQ4Review?"review":null);
                            const kindAt=(i)=>{const r2=rows[i];if(!r2)return null;const t=r2.type;if(t==="Exam")return "exam";if(t==="Review"&&unitByIdx[i]===0)return "review";return null;};
                            const prevRedKind=idx>0?kindAt(idx-1):null;
                            const nextRedKind=idx+1<rows.length?kindAt(idx+1):null;
                            const redTop=redKind&&redKind!==prevRedKind;
                            const redBottom=redKind&&redKind!==nextRedKind;
                            const redColor=redKind==="exam"?"#991b1b":(redKind==="review"?"#ef4444":null);
                            // Background (Exam/Benchmark transparent; red/green borders override unit borders)
                            const rowBg=typeCfg?.rowBg?typeCfg.rowBg:(isBench?"rgba(187,247,208,0.5)":(isExam?"rgba(254,202,202,0.5)":(isPostQ4Review?"rgba(254,226,226,0.4)":unitColor)));
                            // Border priority: benchmark > red > unit
                            const sideBorder=isBench?"3px solid #166534":(redKind?`3px solid ${redColor}`:(inUnit?`3px solid ${unitBorderColor}`:undefined));
                            const unitLeftBorder=sideBorder;
                            const unitRightBorder=sideBorder;
                            const topOverride=benchTop?"3px solid #166534":(redTop?`3px solid ${redColor}`:null);
                            const bottomOverride=benchBottom?"3px solid #166534":(redBottom?`3px solid ${redColor}`:((isQuizRow&&inUnit)?`3px solid ${unitBorderColor}`:null));
                            const quizBorderBottom=bottomOverride;
                            const cellTopBorder=topOverride;
                            // Selection glow (F1)
                            const glowColor=inUnit?UNIT_BORDER_COLORS[unitNum-1]:"#6b7280";
                            const selectionGlow=isSelected?`0 0 0 3px ${glowColor}, 0 0 12px 3px ${glowColor}`:"none";
                            const isAnimating=pacingRecentlySelected.has(idx);
                            const dayFull=DAY_FULL[r.day]||r.day;
                            const mergeHeight=54;
                            const displayAsMerged=isMerged&&!r.keepContent;
                            const noClassCategory=r.noClassCategory||(rowType==="Break/Holiday"?"Break":rowType==="No School"?"No School":rowType==="Class Canceled"?"Class Canceled":rowType==="Field Trip"?"Field Trip":rowType==="No Class"?"No Class":rowType);
                            const noClassName=r.noClassName||r.breakLabel||"";
                            const animStyle=isAnimating?{animation:"pacing-row-squeeze 0.8s ease"}:{};
                            const cellStyle={padding:"4px 6px",verticalAlign:"middle",height:`${mergeHeight}px`,maxHeight:`${mergeHeight}px`,overflow:"hidden",...(quizBorderBottom?{borderBottom:quizBorderBottom}:{}),...(cellTopBorder?{borderTop:cellTopBorder}:{}),...animStyle};
                            const textAreaStyle={border:"1px solid transparent",outline:"none",background:"transparent",fontSize:13,width:"100%",padding:"2px 4px",fontFamily:"Tahoma,sans-serif",color:T.text,resize:"none",lineHeight:"1.3",height:"50px",boxSizing:"border-box"};
                            const sizeFor=(f)=>f==="lessonTopic"?13.5:f==="centralFocus"?12:f==="learningObjectives"?12:f==="standards"?11.5:12;
                            const cellMatches=searchMatches.filter(sm=>sm.rowIdx===idx);
                            const renderEditableCell=(field,smaller,extraStyle,onDoubleClick)=>{const v=r[field]||"";const hasFmt=hasMdFormatting(v);const fs=sizeFor(field);const fieldMatches=cellMatches.filter(sm=>sm.field===field);const hasMatches=fieldMatches.length>0;const showOverlay=hasFmt||hasMatches;let overlayHtml="";if(showOverlay){const esc=s=>s.replace(/</g,"&lt;").replace(/>/g,"&gt;");if(hasMatches){const sorted=[...fieldMatches].sort((a,b)=>a.start-b.start);let out="";let pos=0;sorted.forEach(sm=>{if(sm.start>pos)out+=esc(v.slice(pos,sm.start));const isCurrent=currentMatch&&currentMatch.rowIdx===idx&&currentMatch.field===field&&currentMatch.start===sm.start;out+=`<mark class="${isCurrent?"pacing-match-current":"pacing-match"}">${esc(v.slice(sm.start,sm.end))}</mark>`;pos=sm.end;});if(pos<v.length)out+=esc(v.slice(pos));overlayHtml=out.replace(/\n/g,"<br/>");}else{overlayHtml=mdToHtml(esc(v).replace(/\n/g,"<br/>"));}}return(<td onDoubleClick={onDoubleClick} style={{...cellStyle,...(extraStyle||{})}}><div style={{position:"relative",height:"50px"}}><textarea value={v} onChange={e=>updateRow(idx,field,e.target.value)} style={{...textAreaStyle,fontSize:fs,color:showOverlay?"transparent":T.text,caretColor:"#1e2a3a",position:"relative",zIndex:2}} onFocus={e=>{e.target.style.border=`1px solid ${T.accent}`;e.target.style.background="#fff";}} onBlur={e=>{e.target.style.border="1px solid transparent";e.target.style.background="transparent";}}/>{showOverlay&&<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",padding:"2px 4px",fontSize:fs,fontFamily:"Tahoma,sans-serif",lineHeight:"1.3",overflow:"auto",color:T.text,whiteSpace:"pre-wrap",wordWrap:"break-word",zIndex:1}} dangerouslySetInnerHTML={{__html:overlayHtml}}/>}</div></td>);};
                            return(
                              <tr key={idx} data-pacing-row-idx={idx} draggable={!isMerged||isSelected} onDragStart={e=>{if(isMerged&&!isSelected){e.preventDefault();return;}setPacingDragIdx(idx);e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();setPacingDragOverIdx(idx);}} onDragLeave={()=>setPacingDragOverIdx(null)} onDrop={e=>{e.preventDefault();if(pacingDragIdx===null||pacingDragIdx===idx){setPacingDragIdx(null);setPacingDragOverIdx(null);return;}const next=[...rows];const contentOnly=r=>({lessonTopic:r.lessonTopic,centralFocus:r.centralFocus,learningObjectives:r.learningObjectives,standards:r.standards,type:r.type,breakLabel:r.breakLabel});const preserve=r=>({date:r.date,day:r.day,week:r.week,overflow:r.overflow});const moving=contentOnly(next[pacingDragIdx]);if(pacingDragIdx<idx){for(let i=pacingDragIdx;i<idx;i++){next[i]={...preserve(next[i]),...contentOnly(next[i+1])};}next[idx]={...preserve(next[idx]),...moving};}else{for(let i=pacingDragIdx;i>idx;i--){next[i]={...preserve(next[i]),...contentOnly(next[i-1])};}next[idx]={...preserve(next[idx]),...moving};}commitRows(next);setPacingDragIdx(null);setPacingDragOverIdx(null);}} onClick={pacingDuplicateMode?()=>placeDuplicate(idx):undefined} style={{borderBottom,borderTop,background:rowBg,opacity:isOverflow?0.4:1,cursor:pacingDuplicateMode?"crosshair":"default",transition:"background 100ms ease, box-shadow 200ms ease",boxShadow:selectionGlow,...(isAnimating?{animation:"pacing-row-squeeze 0.8s ease"}:{})}}>
                                <td style={{padding:"0",textAlign:"center",verticalAlign:"middle",height:`${mergeHeight}px`,borderLeft:unitLeftBorder,...(quizBorderBottom?{borderBottom:quizBorderBottom}:{}),...(cellTopBorder?{borderTop:cellTopBorder}:{}),...animStyle}}>
                                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><input type="checkbox" checked={isSelected} onChange={e=>{toggleRow(idx,e.nativeEvent.shiftKey);}} onClick={e=>e.stopPropagation()} style={{width:20,height:20,cursor:"pointer",accentColor:T.accent||"#0d9488"}}/></div>
                                </td>
                                <td style={{padding:"4px 8px",verticalAlign:"middle",fontSize:11,whiteSpace:"nowrap",lineHeight:"1.25",height:`${mergeHeight}px`,textAlign:"center",cursor:"grab",...(quizBorderBottom?{borderBottom:quizBorderBottom}:{}),...(cellTopBorder?{borderTop:cellTopBorder}:{}),...animStyle}} title="Drag row to reorder">{displayAsMerged?(<div style={{fontWeight:"bold",color:T.text,textAlign:"center",fontSize:12}}>{noClassCategory}</div>):showWeek?(<><div style={{fontWeight:"bold",color:T.text,fontSize:12}}>{term}</div><div style={{color:T.textMuted,fontSize:13}}>{weekNum}</div></>):null}</td>
                                <td style={{padding:"4px 8px",verticalAlign:"middle",lineHeight:"1.25",height:`${mergeHeight}px`,position:"relative",overflow:"visible",textAlign:"left",...(quizBorderBottom?{borderBottom:quizBorderBottom}:{}),...(cellTopBorder?{borderTop:cellTopBorder}:{}),...animStyle}}>{r.isMergedRange?(<div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13.5,fontWeight:"normal",color:T.textMuted,whiteSpace:"nowrap",zIndex:5,pointerEvents:"none"}}>{r.date}</div>):(<div style={{whiteSpace:"nowrap"}}><div style={{fontWeight:"bold",color:T.text,fontSize:12}}>{dayFull}</div><div style={{color:T.textMuted,fontSize:13.5}}>{r.date}</div></div>)}</td>
                                {displayAsMerged?(
                                  <td colSpan={4} style={{padding:"4px 8px",verticalAlign:"middle",textAlign:"center",fontWeight:"bold",fontSize:14,color:T.text,height:`${mergeHeight}px`,borderRight:unitRightBorder,...(quizBorderBottom?{borderBottom:quizBorderBottom}:{}),...(cellTopBorder?{borderTop:cellTopBorder}:{}),...animStyle}}>{noClassName||noClassCategory}</td>
                                ):(<>
                                  {renderEditableCell("lessonTopic",false)}
                                  {renderEditableCell("centralFocus",false)}
                                  {renderEditableCell("learningObjectives",false)}
                                  {renderEditableCell("standards",true,{borderRight:unitRightBorder})}
                                </>)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </>)}
                </div>
                  );})()}
              </div>
            </div>
          )}
        </div>
        {pacingAutoTagModal&&(()=>{const{detections,enabled,dateOverrides={}}=pacingAutoTagModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);const toggleDetection=(i)=>{const next=new Set(enabled);if(next.has(i))next.delete(i);else next.add(i);setPacingAutoTagModal({...pacingAutoTagModal,enabled:next});};
          const setDateOverride=(i,value)=>{setPacingAutoTagModal({...pacingAutoTagModal,dateOverrides:{...dateOverrides,[i]:value}});};
          const modalApplyAutoTags=(dets,en)=>{const next=[...rows];dets.forEach((d,i)=>{if(!en.has(i))return;const cfg=PACING_TYPE_CONFIG[d.type];const r=next[d.idx];const otherFields=["centralFocus","learningObjectives","standards"];const stripped={};otherFields.forEach(f=>{stripped[f]=stripMdFormatting(r[f]||"");});const overrideDate=dateOverrides[i];next[d.idx]={...r,type:d.type,lessonTopic:cfg.wrap(stripMdFormatting(r.lessonTopic||"")),...stripped,...(overrideDate!==undefined&&overrideDate!==r.date?{date:overrideDate}:{})};});setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingAutoTagModal(null);};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingAutoTagModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:680,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\ud83e\uddea"} Auto-Tag Detected Rows</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:12}}>Review the {detections.length} detected rows. Uncheck any you don't want to tag, then click Apply.</div>
              <div style={{flex:1,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8,padding:8,marginBottom:16}}>
                {detections.map((d,i)=>{const r=rows[d.idx];const typeCfg=PACING_TYPE_CONFIG[d.type];const isChecked=enabled.has(i);const currentDate=dateOverrides[i]!==undefined?dateOverrides[i]:(r.date||suggestPacingDateRange(rows,[d.idx]));return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderBottom:`1px solid ${T.border}`,background:isChecked?"#f0fdf4":"transparent"}}>
                    <input type="checkbox" checked={isChecked} onChange={()=>toggleDetection(i)} style={{width:18,height:18,cursor:"pointer",accentColor:T.accent||"#0d9488",flexShrink:0}}/>
                    <span style={{background:typeCfg.rowBg||"#e5e7eb",color:T.text,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:"bold",minWidth:72,textAlign:"center",flexShrink:0}}>{d.type}</span>
                    <input value={currentDate} onChange={e=>setDateOverride(i,e.target.value)} disabled={!isChecked} style={{fontSize:11,padding:"3px 6px",width:95,border:`1px solid ${T.border}`,borderRadius:4,background:isChecked?T.surface:"transparent",color:T.text,flexShrink:0,opacity:isChecked?1:0.5,fontFamily:"Tahoma,sans-serif"}} title="Edit date"/>
                    <span style={{fontSize:13,color:T.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span>
                  </div>
                );})}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setPacingAutoTagModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={()=>modalApplyAutoTags(detections,enabled)} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Apply {enabled.size} Tag{enabled.size===1?"":"s"}</button>
              </div>
            </div>
          </div>
        );})()}
        {pacingNoClassModal&&(()=>{const m=pacingNoClassModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);
          const apply=()=>{const{rowIndices,category,name,dateField,keepContent}=m;const merge=keepContent?false:m.merge;const displayLabel=name.trim()?`${category}: ${name.trim()}`:category;const next=[...rows];rowIndices.forEach((idx,i)=>{const base={...next[idx],type:"No Class",breakLabel:displayLabel,noClassCategory:category,noClassName:name.trim(),keepContent:!!keepContent};if(keepContent){const lt=stripMdFormatting(next[idx].lessonTopic||"");base.lessonTopic=lt?`~~${lt}~~`:"";const cf=stripMdFormatting(next[idx].centralFocus||"");base.centralFocus=cf?`~~${cf}~~`:"";base.mergedParent=false;base.mergedHidden=false;base.isMergedRange=false;}else{base.lessonTopic="";base.centralFocus="";base.learningObjectives="";base.standards="";if(merge){if(i===0){base.mergedParent=true;base.mergedHidden=false;base.isMergedRange=true;base.date=dateField||next[idx].date;base.day="";}else{base.mergedHidden=true;}}else{base.mergedParent=false;base.mergedHidden=false;base.isMergedRange=false;base.date=dateField||next[idx].date;}}next[idx]=base;});setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingSelectedRows(new Set());setPacingNoClassModal(null);};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingNoClassModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:480,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\ud83d\udeab"} No Class</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>{m.dayCount} day{m.dayCount===1?"":"s"} selected. Mark this period as a non-instructional day.</div>
              <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>Category</label>
              <select value={m.category} onChange={e=>setPacingNoClassModal({...m,category:e.target.value})} style={{width:"100%",padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:12,boxSizing:"border-box",background:T.surface,color:T.text}}>
                <option value="Break">Break</option>
                <option value="Holiday">Holiday</option>
                <option value="No School">No School</option>
                <option value="Class Canceled">Class Canceled</option>
                <option value="Field Trip">Field Trip</option>
                <option value="Other">Other</option>
              </select>
              <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>Name (optional)</label>
              <input value={m.name} onChange={e=>setPacingNoClassModal({...m,name:e.target.value})} placeholder="e.g., Thanksgiving, Good Friday, Zoo Field Trip" style={{width:"100%",padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:12,boxSizing:"border-box",background:T.surface,color:T.text}} autoFocus/>
              <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>{m.dayCount>1?"Date Range":"Date"}</label>
              <input value={m.dateField||""} onChange={e=>setPacingNoClassModal({...m,dateField:e.target.value})} placeholder={m.dayCount>1?"e.g., 19 Sep 26 \u2013 25 Sep 26":"e.g., 19 Sep 26"} style={{width:"100%",padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:4,boxSizing:"border-box",background:T.surface,color:T.text}}/>
              <div style={{fontSize:11,color:T.textMuted,marginBottom:12}}>Auto-filled from selected/surrounding rows. Editable.</div>
              {m.dayCount>1&&(
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:T.text,marginBottom:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={m.merge} onChange={e=>setPacingNoClassModal({...m,merge:e.target.checked})} style={{width:18,height:18,accentColor:"#0d9488"}}/>
                  Merge selected rows into a single block
                </label>
              )}
              <label style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:T.text,marginBottom:16,cursor:"pointer"}}>
                <input type="checkbox" checked={m.keepContent} onChange={e=>setPacingNoClassModal({...m,keepContent:e.target.checked})} style={{width:18,height:18,accentColor:"#0d9488",marginTop:2,flexShrink:0}}/>
                <span>Keep original lesson content (strikethrough)<div style={{fontSize:11,color:T.textMuted,fontWeight:"normal"}}>Preserves Lesson Topic and Central Focus with strikethrough formatting. Useful when a lesson was planned but the class did not meet.</div></span>
              </label>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setPacingNoClassModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={apply} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Apply</button>
              </div>
            </div>
          </div>
        );})()}
        {pacingImportModal&&(()=>{const m=pacingImportModal;const curCourse=pacingCourseByYear[pacingGuideYear];const existingRows=getPacingRows(pacingGuideYear,curCourse)||[];
          const runImport=()=>{const{importRows,mode,mergeConflict}=m;const blankRow={week:"",date:"",day:"",type:"Instruction",lessonTopic:"",centralFocus:"",learningObjectives:"",standards:""};let next=[];let unmatched=[];let matchedCount=0;
            if(mode==="overwrite"){next=importRows.map(r=>({...blankRow,...r}));unmatched=[];matchedCount=importRows.length;}
            else{const existing=[...existingRows];const byDate=new Map();existing.forEach((r,i)=>{if(r.date)byDate.set(r.date,i);});
              importRows.forEach(imp=>{const idx=imp.date?byDate.get(imp.date):undefined;if(idx!==undefined){matchedCount++;const cur=existing[idx];if(mode==="merge"&&mergeConflict==="importWins"){existing[idx]={...cur,lessonTopic:imp.lessonTopic||"",centralFocus:imp.centralFocus||"",learningObjectives:imp.learningObjectives||"",standards:imp.standards||"",type:imp.type||cur.type||"Instruction",breakLabel:imp.breakLabel||cur.breakLabel||"",noClassCategory:imp.noClassCategory||cur.noClassCategory||"",noClassName:imp.noClassName||cur.noClassName||"",mergedParent:!!imp.mergedParent,mergedHidden:!!imp.mergedHidden,isMergedRange:!!imp.isMergedRange,keepContent:!!imp.keepContent};}
                else{const fill=(a,b)=>(a&&a.toString().trim())?a:(b||"");existing[idx]={...cur,lessonTopic:fill(cur.lessonTopic,imp.lessonTopic),centralFocus:fill(cur.centralFocus,imp.centralFocus),learningObjectives:fill(cur.learningObjectives,imp.learningObjectives),standards:fill(cur.standards,imp.standards),type:cur.type||imp.type||"Instruction"};}
              }else{unmatched.push(imp);}});
              next=[...existing,...unmatched.map(r=>({...blankRow,...r}))];}
            next.push({...blankRow});
            setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(existingRows))}]);
            setPacingRedoStack([]);
            setPacingRows(pacingGuideYear,curCourse,next);
            setPacingSelectedRows(new Set());
            setPacingImportModal(null);
            setPacingImportReport({imported:importRows.length,matched:matchedCount,unmatched:unmatched.length,mode,totalAfter:next.length});};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingImportModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:540,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\u2b07\ufe0f"} Import Pacing JSON</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>File: <strong>{m.fileName}</strong> \u2014 {m.importRows.length} row(s). Current table: {existingRows.length} row(s).</div>
              <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:8}}>Import mode</label>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:8,padding:10,border:`2px solid ${m.mode==="overwrite"?"#0d9488":T.border}`,borderRadius:8,cursor:"pointer",background:m.mode==="overwrite"?"#f0fdfa":"transparent"}}>
                  <input type="radio" name="importMode" checked={m.mode==="overwrite"} onChange={()=>setPacingImportModal({...m,mode:"overwrite"})} style={{marginTop:2}}/>
                  <div><div style={{fontWeight:"bold",color:T.text,fontSize:13}}>Overwrite</div><div style={{fontSize:11,color:T.textMuted}}>Replace existing table entirely with the imported rows. Current data is lost.</div></div>
                </label>
                <label style={{display:"flex",alignItems:"flex-start",gap:8,padding:10,border:`2px solid ${m.mode==="merge"?"#0d9488":T.border}`,borderRadius:8,cursor:"pointer",background:m.mode==="merge"?"#f0fdfa":"transparent"}}>
                  <input type="radio" name="importMode" checked={m.mode==="merge"} onChange={()=>setPacingImportModal({...m,mode:"merge"})} style={{marginTop:2}}/>
                  <div style={{flex:1}}><div style={{fontWeight:"bold",color:T.text,fontSize:13}}>Merge</div><div style={{fontSize:11,color:T.textMuted,marginBottom:m.mode==="merge"?8:0}}>Match rows by date. Unmatched imported rows are appended to the end.</div>
                    {m.mode==="merge"&&(
                      <div style={{paddingLeft:12,borderLeft:`2px solid ${T.border}`,display:"flex",flexDirection:"column",gap:4}}>
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                          <input type="radio" name="mergeConflict" checked={m.mergeConflict==="importWins"} onChange={()=>setPacingImportModal({...m,mergeConflict:"importWins"})}/>
                          <span style={{color:T.text}}>Import wins <span style={{color:T.textMuted}}>(imported values replace existing on matched rows)</span></span>
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                          <input type="radio" name="mergeConflict" checked={m.mergeConflict==="existingWins"} onChange={()=>setPacingImportModal({...m,mergeConflict:"existingWins"})}/>
                          <span style={{color:T.text}}>Existing wins <span style={{color:T.textMuted}}>(keep current values; only fill blank cells from import)</span></span>
                        </label>
                      </div>
                    )}
                  </div>
                </label>
                <label style={{display:"flex",alignItems:"flex-start",gap:8,padding:10,border:`2px solid ${m.mode==="fillEmpty"?"#0d9488":T.border}`,borderRadius:8,cursor:"pointer",background:m.mode==="fillEmpty"?"#f0fdfa":"transparent"}}>
                  <input type="radio" name="importMode" checked={m.mode==="fillEmpty"} onChange={()=>setPacingImportModal({...m,mode:"fillEmpty",mergeConflict:"existingWins"})} style={{marginTop:2}}/>
                  <div><div style={{fontWeight:"bold",color:T.text,fontSize:13}}>Fill empty cells only</div><div style={{fontSize:11,color:T.textMuted}}>Match by date. Only copy imported values into cells that are currently blank.</div></div>
                </label>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setPacingImportModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={runImport} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Import</button>
              </div>
            </div>
          </div>
        );})()}
        {pacingImportReport&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingImportReport(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:460,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\u2705"} Import Complete</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Mode: <strong style={{color:T.text}}>{pacingImportReport.mode==="overwrite"?"Overwrite":pacingImportReport.mode==="merge"?"Merge":"Fill empty cells only"}</strong></div>
              <div style={{background:T.surface2||"#f9fafb",border:`1px solid ${T.border}`,borderRadius:8,padding:14,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,color:T.text}}><span>Rows in file:</span><strong>{pacingImportReport.imported}</strong></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,color:T.text}}><span>Matched by date:</span><strong style={{color:"#16a34a"}}>{pacingImportReport.matched}</strong></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,color:T.text}}><span>Unmatched (appended):</span><strong style={{color:pacingImportReport.unmatched>0?"#f59e0b":T.textMuted}}>{pacingImportReport.unmatched}</strong></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.text,borderTop:`1px solid ${T.border}`,paddingTop:6,marginTop:6}}><span>Table total (incl. +1 blank):</span><strong>{pacingImportReport.totalAfter}</strong></div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button onClick={()=>setPacingImportReport(null)} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>OK</button>
              </div>
            </div>
          </div>
        )}
        {pacingAddRowModal&&(()=>{const m=pacingAddRowModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);
          const quickPick=(type)=>{const templates={"Instruction":m.suggestContinued||"","Quiz":"Quiz: ","Review":"Review: ","Exam":"Exam: ","Benchmark":"Benchmark","No Class":""};setPacingAddRowModal({...m,type,lessonTopic:templates[type]||m.lessonTopic});};
          const modalAddRow=()=>{const cfg=PACING_TYPE_CONFIG[m.type]||PACING_TYPE_CONFIG["Instruction"];const newRow={week:"",date:"",day:"",type:m.type,lessonTopic:cfg.wrap(m.lessonTopic||""),centralFocus:m.centralFocus||"",learningObjectives:m.learningObjectives||"",standards:m.standards||""};if(cfg.merged){newRow.breakLabel=m.type;}const next=[...rows];next.splice(m.insertAt,0,newRow);setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingSelectedRows(new Set([m.insertAt]));setPacingAddRowModal(null);};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingAddRowModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\u2795"} Add New Row</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Inserting at position {m.insertAt+1}. Quick-pick a type below or fill in the fields manually.</div>
              <div style={{flex:1,overflowY:"auto"}}>
                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:6}}>Quick Pick Type</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {PACING_ROW_TYPES.map(t=>{const isActive=m.type===t;return(
                      <button key={t} onClick={()=>quickPick(t)} style={{background:isActive?"#0d9488":"#4b5563",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:"bold",transition:"all 150ms ease"}}>{t}</button>
                    );})}
                  </div>
                </div>
                {m.suggestContinued&&(
                  <div style={{marginBottom:12,padding:"8px 12px",background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:6,fontSize:12,color:"#92400e",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span><strong>Suggestion:</strong> {m.suggestContinued}</span>
                    <button onClick={()=>setPacingAddRowModal({...m,lessonTopic:m.suggestContinued})} style={{background:"#f59e0b",color:"#fff",border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:11,fontWeight:"bold"}}>Use</button>
                  </div>
                )}
                <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginTop:8,marginBottom:4}}>Lesson Topic</label>
                <input value={m.lessonTopic} onChange={e=>setPacingAddRowModal({...m,lessonTopic:e.target.value})} placeholder="e.g., Triangle Congruence Criteria Continued" style={{width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:10,boxSizing:"border-box",background:T.surface,color:T.text}} autoFocus/>
                <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>Central Focus</label>
                <textarea value={m.centralFocus} onChange={e=>setPacingAddRowModal({...m,centralFocus:e.target.value})} rows={2} placeholder="Optional \u2014 brief description of the lesson's focus" style={{width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:10,boxSizing:"border-box",background:T.surface,color:T.text,fontFamily:"Tahoma,sans-serif",resize:"vertical"}}/>
                <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>Learning Objectives</label>
                <textarea value={m.learningObjectives} onChange={e=>setPacingAddRowModal({...m,learningObjectives:e.target.value})} rows={2} placeholder="Optional \u2014 what students will know or be able to do" style={{width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:6,marginBottom:10,boxSizing:"border-box",background:T.surface,color:T.text,fontFamily:"Tahoma,sans-serif",resize:"vertical"}}/>
                <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:4}}>MSCCRS</label>
                <input value={m.standards} onChange={e=>setPacingAddRowModal({...m,standards:e.target.value})} placeholder="e.g., G-CO.8" style={{width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:6,boxSizing:"border-box",background:T.surface,color:T.text}}/>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>setPacingAddRowModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={modalAddRow} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Add Row</button>
              </div>
            </div>
          </div>
        );})()}
        {pastePacingModal&&(()=>{const m=pastePacingModal;const plan=savedPlans.find(p=>p.id===m.planId);if(!plan)return null;
          const setSelected=(i)=>setPastePacingModal({...m,selectedSourceIdx:i});
          const updatePairing=(day,patch)=>setPastePacingModal({...m,pairings:{...m.pairings,[day]:{...m.pairings[day],...patch}}});
          const assignSelectedTo=(day)=>{if(m.selectedSourceIdx==null)return;updatePairing(day,{sourceIdx:m.selectedSourceIdx,enabled:true});};
          const clearSource=(day)=>updatePairing(day,{sourceIdx:null,enabled:false,overwrite:false});
          const toggleAll=(v)=>{const np={};DAYS.forEach(d=>{np[d]={...m.pairings[d],enabled:v};});setPastePacingModal({...m,pairings:np});};
          const pasteCount=DAYS.reduce((acc,d)=>{const p=m.pairings[d];if(!p.enabled||p.sourceIdx==null)return acc;const existing=(plan.planData?.[d]?.lessonTitle||"").trim();if(existing&&!p.overwrite)return acc;return acc+1;},0);
          // Group allRows by week for rendering with sticky headers
          const groups=[];const seenWeek=new Map();
          m.allRows.forEach((r,i)=>{const key=r.week||"(no week)";if(!seenWeek.has(key)){seenWeek.set(key,groups.length);groups.push({week:key,items:[]});}groups[seenWeek.get(key)].items.push({row:r,idx:i});});
          const typeBadgeColor=(t)=>t==="Quiz"||t==="Exam"||t==="Benchmark"?"#fee2e2":t==="Review"?"#dbeafe":t==="Writing Day"?"#fef3c7":"#e5e7eb";
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPastePacingModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:20,width:960,height:"85vh",maxHeight:720,display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:2}}>{"\ud83d\udccb"} Pacing Guide Paste</div>
              <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>{m.course} &middot; {m.year} &middot; week: {m.termWeek||"\u2014"} &middot; {m.allRows.length} pacing row(s) available</div>
              {m.allRows.length===0?(
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:T.textMuted,fontSize:14}}>
                  <div style={{fontSize:36,marginBottom:10}}>{"\ud83d\udcc4"}</div>
                  No pacing rows found for {m.course} {m.year}.
                </div>
              ):(
              <div style={{flex:1,display:"flex",gap:12,minHeight:0}}>
                {/* Left panel: scrollable pacing list */}
                <div style={{flex:"1 1 55%",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2||"#f9fafb",minHeight:0}}>
                  <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`,fontSize:12,fontWeight:"bold",color:T.text,background:T.surface}}>Pacing Rows &mdash; click to select, then click Assign on a day</div>
                  <div id="paste-pacing-list" style={{flex:1,overflowY:"auto"}}>
                    {groups.map(g=>(
                      <div key={g.week}>
                        <div style={{position:"sticky",top:0,background:"#1a1a1a",color:"#f0f0f0",padding:"4px 12px",fontSize:12,fontWeight:"bold",zIndex:2}}>{g.week}</div>
                        {g.items.map(({row,idx})=>{const isSelected=m.selectedSourceIdx===idx;const isCurrent=m.currentWeekIdxs.includes(idx);const isUsed=DAYS.some(d=>m.pairings[d].sourceIdx===idx);return(
                          <div key={idx} id={isCurrent&&m.currentWeekIdxs[0]===idx?"paste-pacing-current":undefined} onClick={()=>setSelected(idx)} style={{padding:"6px 12px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:isSelected?"#e0f2fe":(isCurrent?"#f0fdf4":"transparent"),boxShadow:isSelected?"inset 3px 0 0 #0284c7":"none",display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:T.textMuted,minWidth:28,fontWeight:"bold"}}>{row.day}</span>
                            <span style={{fontSize:11,color:T.textMuted,minWidth:62}}>{row.date}</span>
                            <span style={{background:typeBadgeColor(row.type),color:"#1f2937",padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:"bold",minWidth:58,textAlign:"center"}}>{row.type}</span>
                            <span style={{flex:1,fontSize:12,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.plainTopic}</span>
                            {isUsed&&<span style={{fontSize:10,color:"#0d9488",fontWeight:"bold"}}>{"\u2713 used"}</span>}
                          </div>
                        );})}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right panel: 5 day slots */}
                <div style={{flex:"1 1 45%",display:"flex",flexDirection:"column",gap:8,minHeight:0,overflowY:"auto"}}>
                  {DAYS.map(day=>{const p=m.pairings[day];const src=p.sourceIdx!=null?m.allRows[p.sourceIdx]:null;const existing=(plan.planData?.[day]?.lessonTitle||"").trim();const hasExisting=existing.length>0;return(
                    <div key={day} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,background:p.enabled?T.surface:"#f3f4f6"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <input type="checkbox" checked={p.enabled} onChange={e=>updatePairing(day,{enabled:e.target.checked})} style={{width:16,height:16,cursor:"pointer",accentColor:"#0d9488"}}/>
                        <span style={{fontSize:13,fontWeight:"bold",color:T.text,flex:1}}>{day}</span>
                        <button onClick={()=>assignSelectedTo(day)} disabled={m.selectedSourceIdx==null} style={{background:m.selectedSourceIdx==null?"#d1d5db":"#0d9488",color:"#fff",border:"none",borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:"bold",cursor:m.selectedSourceIdx==null?"default":"pointer"}} title="Assign currently-selected row in the left list to this day">Assign</button>
                        <button onClick={()=>clearSource(day)} disabled={p.sourceIdx==null} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 8px",fontSize:11,cursor:p.sourceIdx==null?"default":"pointer",opacity:p.sourceIdx==null?0.4:1}}>Clear</button>
                      </div>
                      {src?(
                        <div style={{fontSize:11,color:T.text,background:T.surface2||"#f9fafb",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 8px"}}>
                          <div style={{fontSize:10,color:T.textMuted,marginBottom:2}}>{src.week||"\u2014"} &middot; {src.day} {src.date} &middot; {src.type}</div>
                          <div style={{fontSize:12,color:T.text,fontWeight:"bold"}}>{src.plainTopic}</div>
                        </div>
                      ):(
                        <div style={{fontSize:11,color:T.textMuted,fontStyle:"italic",padding:"4px 0"}}>&mdash; No source &mdash;</div>
                      )}
                      {hasExisting&&p.enabled&&p.sourceIdx!=null&&(
                        <label style={{display:"flex",alignItems:"flex-start",gap:6,marginTop:6,padding:"4px 6px",background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:4,fontSize:11,color:"#92400e",cursor:"pointer"}}>
                          <input type="checkbox" checked={p.overwrite} onChange={e=>updatePairing(day,{overwrite:e.target.checked})} style={{marginTop:2}}/>
                          <span>{"\u26a0"} Will overwrite: "{existing.slice(0,60)}{existing.length>60?"\u2026":""}"</span>
                        </label>
                      )}
                    </div>
                  );})}
                </div>
              </div>
              )}
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>toggleAll(true)} style={{background:"transparent",color:"#0d9488",border:"none",fontSize:12,cursor:"pointer",fontWeight:"bold"}}>Select all</button>
                <button onClick={()=>toggleAll(false)} style={{background:"transparent",color:T.textMuted,border:"none",fontSize:12,cursor:"pointer",fontWeight:"bold"}}>Deselect all</button>
                <div style={{flex:1}}/>
                <button onClick={()=>setPastePacingModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={runPastePacing} disabled={pasteCount===0} style={{background:pasteCount===0?"#9ca3af":"#0d9488",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:pasteCount===0?"default":"pointer",fontSize:13,fontWeight:"bold"}}>Paste {pasteCount} topic{pasteCount===1?"":"s"}</button>
              </div>
            </div>
          </div>
        );})()}
        {pacingMergeModal&&(()=>{const m=pacingMergeModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);
          const toggleSourceInclude=(fieldKey,idx)=>{const next={...m.selections};const sel=next[fieldKey];const nextSet=new Set(sel.includeIdx);if(nextSet.has(idx))nextSet.delete(idx);else nextSet.add(idx);next[fieldKey]={...sel,includeIdx:nextSet};setPacingMergeModal({...m,selections:next});};
          const setCustomText=(fieldKey,text)=>{const next={...m.selections};next[fieldKey]={...next[fieldKey],customText:text};setPacingMergeModal({...m,selections:next});};
          const buildMergedValue=(fieldKey)=>{const sel=m.selections[fieldKey];const parts=[];[...sel.includeIdx].sort((a,b)=>a-b).forEach(idx=>{const v=(rows[idx]?.[fieldKey]||"").trim();if(v)parts.push(v);});if(sel.customText.trim())parts.push(sel.customText.trim());return parts.join(" ");};
          const applyMerge=(dateMode)=>{const next=[...rows];const targetIdx=m.targetIdx;const merged={};m.fields.forEach(f=>{merged[f.key]=buildMergedValue(f.key);});
            if(m.editMode){next[targetIdx]={...next[targetIdx],...merged,date:m.dateRange};setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingMergeModal(null);return;}
            next[targetIdx]={...next[targetIdx],...merged,date:m.dateRange,day:"",isMergedRange:true};const sortedSelected=[...pacingSelectedRows].sort((a,b)=>a-b);const toDelete=sortedSelected.filter(i=>i!==targetIdx).sort((a,b)=>b-a);
            const contentOnly=r=>({lessonTopic:r.lessonTopic,centralFocus:r.centralFocus,learningObjectives:r.learningObjectives,standards:r.standards,type:r.type,breakLabel:r.breakLabel,isMergedRange:r.isMergedRange,mergedParent:r.mergedParent,mergedHidden:r.mergedHidden});
            const preserveAllButContent=r=>({date:r.date,day:r.day,week:r.week,overflow:r.overflow});
            const preserveContentOnly=r=>({lessonTopic:r.lessonTopic,centralFocus:r.centralFocus,learningObjectives:r.learningObjectives,standards:r.standards,type:r.type,breakLabel:r.breakLabel,isMergedRange:r.isMergedRange,mergedParent:r.mergedParent,mergedHidden:r.mergedHidden,overflow:r.overflow});
            if(dateMode==="inherit"){
              // Cascade: shift CONTENT up, keep each row's date/day/week at its fixed calendar position
              toDelete.forEach(idx=>{for(let i=idx;i<next.length-1;i++){next[i]={...preserveAllButContent(next[i]),...contentOnly(next[i+1])};}next[next.length-1]={...preserveAllButContent(next[next.length-1]),lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"Instruction",breakLabel:""};});
            }else{
              // Keep original dates: the row objects themselves shift up, dragging their dates along
              toDelete.forEach(idx=>{next.splice(idx,1);});
            }
            setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingSelectedRows(new Set([targetIdx]));setPacingMergeModal(null);
          };
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingMergeModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:760,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{m.editMode?"\u270f\ufe0f Edit Merged Row":`\ud83d\udd17 Merge ${m.sources.length} Rows`}</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>{m.editMode?"Edit the contents of this merged row. Date range and all four content fields are editable.":`Content merges into the first selected row. The other ${m.sources.length-1} row${m.sources.length>2?"s":""} will be deleted and subsequent rows shift up.`}</div>
              <div style={{marginBottom:16,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2||"#f9fafb"}}>
                <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:6}}>Date Range</label>
                <input value={m.dateRange||""} onChange={e=>setPacingMergeModal({...m,dateRange:e.target.value})} placeholder="e.g., 15 Jul 26 – 17 Jul 26" style={{width:"100%",padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`,borderRadius:6,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>Auto-filled based on the selected rows. Editable.</div>
              </div>
              <div style={{flex:1,overflowY:"auto",paddingRight:4}}>
                {m.fields.map(f=>{const sel=m.selections[f.key];return(
                  <div key={f.key} style={{marginBottom:20,border:`1px solid ${T.border}`,borderRadius:8,padding:12,background:T.surface2||"#f9fafb"}}>
                    <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>{f.label}</div>
                    {m.sources.map(s=>{const v=(s.row[f.key]||"").trim();const isChecked=sel.includeIdx.has(s.idx);return(
                      <label key={s.idx} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"4px 0",cursor:"pointer",opacity:v?1:0.5}}>
                        <input type="checkbox" checked={isChecked} onChange={()=>toggleSourceInclude(f.key,s.idx)} disabled={!v} style={{width:18,height:18,marginTop:2,cursor:v?"pointer":"default",accentColor:T.accent||"#0d9488"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>{s.row.date} {DAY_FULL[s.row.day]||s.row.day}</div>
                          <div style={{fontSize:13,color:v?T.text:T.textMuted,fontStyle:v?"normal":"italic"}}>{v||"(empty)"}</div>
                        </div>
                      </label>
                    );})}
                    <div style={{marginTop:8}}>
                      <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:4}}>Additional custom text (appended)</label>
                      <input value={sel.customText} onChange={e=>setCustomText(f.key,e.target.value)} placeholder="Optional new text to add..." style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                    </div>
                    <div style={{marginTop:8,padding:"6px 8px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:4,fontSize:12,color:"#166534"}}>
                      <strong>Preview:</strong> {buildMergedValue(f.key)||<em style={{opacity:0.6}}>(empty)</em>}
                    </div>
                  </div>
                );})}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>setPacingMergeModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={()=>{if(m.editMode){applyMerge("keep");return;}setPacingMergeModal({...m,showDateConfirm:true});}} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Merge Rows</button>
              </div>
            </div>
            {m.showDateConfirm&&(
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3100}} onClick={e=>e.stopPropagation()}>
                <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:440,boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
                  <div style={{fontSize:17,fontWeight:"bold",color:T.text,marginBottom:8}}>Dates for Cascaded Rows</div>
                  <div style={{fontSize:13,color:T.textMuted,marginBottom:18,lineHeight:1.4}}>When the other {m.sources.length-1} row{m.sources.length>2?"s are":" is"} deleted, the rows below will shift up. How should their dates be handled?</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <button onClick={()=>applyMerge("keep")} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                      <div>Keep original dates</div>
                      <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Rows move up with their own dates. Calendar may skip days.</div>
                    </button>
                    <button onClick={()=>applyMerge("inherit")} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                      <div>Inherit from new position</div>
                      <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Content shifts up; each row adopts the date of its new slot. Calendar stays continuous.</div>
                    </button>
                    <button onClick={()=>setPacingMergeModal({...m,showDateConfirm:false})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",marginTop:4}}>Back</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );})()}
        {pacingDeleteModal&&(()=>{const m=pacingDeleteModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);const commitRows=(next)=>commitPacingRows(pacingGuideYear,curCourse,rows,next);const indices=m.indices;const hasLocked=indices.some(i=>{const r=rows[i];const cfg=PACING_TYPE_CONFIG[r.type||"Instruction"];return cfg&&cfg.merged;});
          const applyRemove=(dateMode)=>{const next=[...rows];if(dateMode==="keep"){const toDelete=[...indices].sort((a,b)=>b-a);toDelete.forEach(idx=>{next.splice(idx,1);});}else{const sortedAsc=[...indices].sort((a,b)=>a-b);const preserveAllButContent=r=>({date:r.date,day:r.day,week:r.week,overflow:r.overflow});const contentOnly=r=>({lessonTopic:r.lessonTopic,centralFocus:r.centralFocus,learningObjectives:r.learningObjectives,standards:r.standards,type:r.type,breakLabel:r.breakLabel,isMergedRange:r.isMergedRange,mergedParent:r.mergedParent,mergedHidden:r.mergedHidden});[...sortedAsc].reverse().forEach(idx=>{for(let i=idx;i<next.length-1;i++){next[i]={...preserveAllButContent(next[i]),...contentOnly(next[i+1])};}next[next.length-1]={...preserveAllButContent(next[next.length-1]),lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"Instruction",breakLabel:"",isMergedRange:false,mergedParent:false,mergedHidden:false};});}
            setPacingUndoStack(s=>[...s.slice(-49),{year:pacingGuideYear,course:curCourse,rows:JSON.parse(JSON.stringify(rows))}]);setPacingRedoStack([]);setPacingRows(pacingGuideYear,curCourse,next);setPacingDeleteModal(null);setPacingSelectedRows(new Set());};
          const applyClear=()=>{const fieldsToClear=m.clearFields;if(fieldsToClear.size===0){setPacingDeleteModal(null);return;}const next=[...rows];indices.forEach(idx=>{const patch={};fieldsToClear.forEach(f=>{if(f==="type"){patch.type="Instruction";patch.lessonTopic=stripMdFormatting(next[idx].lessonTopic||"");}else{patch[f]="";}});next[idx]={...next[idx],...patch};});commitRows(next);setPacingDeleteModal(null);setPacingSelectedRows(new Set());};
          const toggleClearField=(f)=>{const ns=new Set(m.clearFields);if(ns.has(f))ns.delete(f);else ns.add(f);setPacingDeleteModal({...m,clearFields:ns});};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingDeleteModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:480,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>Delete {indices.length} row{indices.length===1?"":"s"}</div>
              {hasLocked&&(<div style={{fontSize:12,color:"#b91c1c",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,padding:"8px 10px",marginBottom:12}}>\u26a0\ufe0f Selection includes merged/locked rows. Unmerge them first via Edit before removing.</div>)}
              {m.stage==="choose"&&(<>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Choose how to delete the selected row(s).</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <button disabled={hasLocked} onClick={()=>setPacingDeleteModal({...m,stage:"removeConfirm"})} style={{background:hasLocked?"#9ca3af":"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:hasLocked?"default":"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                    <div>Remove rows completely</div>
                    <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Splice the selected rows out of the table. Subsequent rows shift up.</div>
                  </button>
                  <button onClick={()=>setPacingDeleteModal({...m,stage:"clearFields"})} style={{background:"#f59e0b",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                    <div>Clear contents</div>
                    <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Wipe specific cells on the selected rows. Pick which fields on the next screen.</div>
                  </button>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
                  <button onClick={()=>setPacingDeleteModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                </div>
              </>)}
              {m.stage==="removeConfirm"&&(<>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Rows below the selection will shift up. How should their dates be handled?</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <button onClick={()=>applyRemove("keep")} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                    <div>Keep original dates</div>
                    <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Rows move up with their own dates. Table shrinks by {indices.length} row(s). Calendar may skip days.</div>
                  </button>
                  <button onClick={()=>applyRemove("inherit")} style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                    <div>Inherit from new position</div>
                    <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Content shifts up; each row adopts the date of its new slot. Table length unchanged. Last {indices.length} row(s) become blank.</div>
                  </button>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
                  <button onClick={()=>setPacingDeleteModal({...m,stage:"choose"})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Back</button>
                </div>
              </>)}
              {m.stage==="clearFields"&&(<>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:12}}>Which fields should be cleared on the {indices.length} selected row{indices.length===1?"":"s"}?</div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                  {[{key:"lessonTopic",label:"Lesson Topic"},{key:"centralFocus",label:"Central Focus"},{key:"learningObjectives",label:"Learning Objectives"},{key:"standards",label:"MSCCRS (standards)"},{key:"type",label:"Type (reset to Instruction)"}].map(f=>(
                    <label key={f.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",background:m.clearFields.has(f.key)?T.surface2||"#f9fafb":T.surface}}>
                      <input type="checkbox" checked={m.clearFields.has(f.key)} onChange={()=>toggleClearField(f.key)} style={{width:18,height:18,cursor:"pointer",accentColor:"#0d9488"}}/>
                      <span style={{fontSize:13,color:T.text}}>{f.label}</span>
                    </label>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setPacingDeleteModal({...m,stage:"choose"})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Back</button>
                  <button onClick={applyClear} disabled={m.clearFields.size===0} style={{background:m.clearFields.size===0?"#9ca3af":"#f59e0b",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:m.clearFields.size===0?"default":"pointer",fontSize:13,fontWeight:"bold"}}>Clear {m.clearFields.size} field{m.clearFields.size===1?"":"s"}</button>
                </div>
              </>)}
            </div>
          </div>
        );})()}
        {pacingShiftDatesModal&&(()=>{const m=pacingShiftDatesModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);const commitRows=(next)=>commitPacingRows(pacingGuideYear,curCourse,rows,next);const indices=m.indices;const delta=m.direction==="down"?m.distance:-m.distance;
          const clipped=indices.filter(i=>{const to=i+delta;return to<0||to>=rows.length;}).length;
          const previewShifted=()=>{const next=rows.map(r=>({...r}));indices.forEach(i=>{next[i]={...next[i],date:"",day:""};});indices.forEach(i=>{const to=i+delta;if(to>=0&&to<rows.length){next[to]={...next[to],date:rows[i].date,day:rows[i].day};}});return next;};
          const computeFlaggedRows=(nextRows)=>{const flagged=[];nextRows.forEach((r,i)=>{if(!r.week)return;const {term:rowTerm,weekNum:rowWeekNum}=parseWeekLabel(r.week);if(!rowTerm||!rowWeekNum)return;const above=i>0?nextRows[i-1]:null;const below=i+1<nextRows.length?nextRows[i+1]:null;const aboveParsed=above?parseWeekLabel(above.week):{term:"",weekNum:""};const belowParsed=below?parseWeekLabel(below.week):{term:"",weekNum:""};const coherent=(aboveParsed.term===rowTerm&&aboveParsed.weekNum===rowWeekNum)||(belowParsed.term===rowTerm&&belowParsed.weekNum===rowWeekNum);if(!coherent)flagged.push(i);});return flagged;};
          const suggestWeekFor=(nextRows,i)=>{for(let j=i-1;j>=0;j--){if(nextRows[j].week){const p=parseWeekLabel(nextRows[j].week);if(p.term&&p.weekNum)return{term:p.term,weekNumRaw:p.weekNum.replace(/^Week\s*/,"")};}}for(let j=i+1;j<nextRows.length;j++){if(nextRows[j].week){const p=parseWeekLabel(nextRows[j].week);if(p.term&&p.weekNum)return{term:p.term,weekNumRaw:p.weekNum.replace(/^Week\s*/,"")};}}return{term:"Term I",weekNumRaw:"1"};};
          const goToTermWeekStep=()=>{const shifted=previewShifted();const flagged=computeFlaggedRows(shifted);const edits={};flagged.forEach(i=>{const s=suggestWeekFor(shifted,i);edits[i]={term:s.term,weekNumRaw:s.weekNumRaw};});setPacingShiftDatesModal({...m,showTermWeekConfirm:true,shifted,flagged,termWeekEdits:edits});};
          const applyShift=()=>{const next=[...(m.shifted||previewShifted())];const edits=m.termWeekEdits||{};Object.keys(edits).forEach(k=>{const i=parseInt(k,10);const e=edits[k];if(e&&e.term&&e.weekNumRaw)next[i]={...next[i],week:`${e.term} ${e.weekNumRaw}`};});commitRows(next);setPacingShiftDatesModal(null);};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingShiftDatesModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:520,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>Shift Dates</div>
              {!m.showTermWeekConfirm&&(<>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Move the date and day values on the {indices.length} selected row{indices.length===1?"":"s"} up or down. Lesson content stays in place.</div>
                <div style={{marginBottom:12}}>
                  <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:6}}>Direction</label>
                  <div style={{display:"flex",gap:8}}>
                    <label style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:`1px solid ${m.direction==="up"?"#ea580c":T.border}`,borderRadius:6,cursor:"pointer",background:m.direction==="up"?"#fff7ed":T.surface}}>
                      <input type="radio" checked={m.direction==="up"} onChange={()=>setPacingShiftDatesModal({...m,direction:"up"})} style={{accentColor:"#ea580c"}}/>
                      <span style={{fontSize:13,color:T.text}}>Shift up</span>
                    </label>
                    <label style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:`1px solid ${m.direction==="down"?"#ea580c":T.border}`,borderRadius:6,cursor:"pointer",background:m.direction==="down"?"#fff7ed":T.surface}}>
                      <input type="radio" checked={m.direction==="down"} onChange={()=>setPacingShiftDatesModal({...m,direction:"down"})} style={{accentColor:"#ea580c"}}/>
                      <span style={{fontSize:13,color:T.text}}>Shift down</span>
                    </label>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{display:"block",fontSize:12,fontWeight:"bold",color:T.text,marginBottom:6}}>Distance (rows)</label>
                  <input type="number" min={1} value={m.distance} onChange={e=>setPacingShiftDatesModal({...m,distance:Math.max(1,parseInt(e.target.value,10)||1)})} style={{width:120,padding:"8px 10px",fontSize:14,border:`1px solid ${T.border}`,borderRadius:6,background:T.surface,color:T.text}}/>
                </div>
                {clipped>0&&(<div style={{padding:"10px 12px",background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:6,fontSize:12,color:"#92400e",marginBottom:12}}>\u26a0\ufe0f {clipped} row{clipped===1?"":"s"} will be clipped \u2014 their date/day values will not land anywhere in the visible table. Continue anyway?</div>)}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                  <button onClick={()=>setPacingShiftDatesModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                  <button onClick={goToTermWeekStep} style={{background:"#ea580c",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Shift</button>
                </div>
              </>)}
              {m.showTermWeekConfirm&&(<>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:12}}>The shift may have pushed some rows into a new week. Review and adjust the term/week labels for any flagged rows, or accept the auto-suggestions.</div>
                <div style={{flex:1,overflowY:"auto",marginBottom:12,border:`1px solid ${T.border}`,borderRadius:6,padding:8,maxHeight:300}}>
                  {(!m.flagged||m.flagged.length===0)?(<div style={{fontSize:12,color:T.textMuted,fontStyle:"italic",padding:8}}>No week-label mismatches detected. All shifted rows appear consistent with their surroundings.</div>):m.flagged.map(i=>{const r=m.shifted[i];const e=m.termWeekEdits[i]||{term:"Term I",weekNumRaw:"1"};return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{flex:1,fontSize:11,color:T.text}}>Row {i+1}: <strong>{r.date||"(no date)"}</strong> <span style={{color:T.textMuted}}>currently "{r.week||"(blank)"}"</span></div>
                      <select value={e.term} onChange={ev=>setPacingShiftDatesModal({...m,termWeekEdits:{...m.termWeekEdits,[i]:{...e,term:ev.target.value}}})} style={{fontSize:12,padding:"4px 6px",borderRadius:4,border:`1px solid ${T.border}`,background:T.surface,color:T.text}}>
                        <option>Term I</option><option>Term II</option><option>Term III</option><option>Term IV</option>
                      </select>
                      <input type="number" min={1} value={e.weekNumRaw} onChange={ev=>setPacingShiftDatesModal({...m,termWeekEdits:{...m.termWeekEdits,[i]:{...e,weekNumRaw:ev.target.value}}})} style={{width:56,fontSize:12,padding:"4px 6px",borderRadius:4,border:`1px solid ${T.border}`,background:T.surface,color:T.text}}/>
                    </div>
                  );})}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setPacingShiftDatesModal({...m,showTermWeekConfirm:false})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Back</button>
                  <button onClick={applyShift} style={{background:"#ea580c",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Apply Shift</button>
                </div>
              </>)}
            </div>
          </div>
        );})()}
        {pacingEditModal&&(()=>{const m=pacingEditModal;const curCourse=pacingCourseByYear[pacingGuideYear];const rows=getPacingRows(pacingGuideYear,curCourse);const commitRows=(next)=>commitPacingRows(pacingGuideYear,curCourse,rows,next);const indices=m.indices;
          const mergedInSelection=indices.filter(i=>rows[i].mergedParent||rows[i].isMergedRange);
          const setDirty=(key,value)=>{const nd=new Set(m.dirty);nd.add(key);setPacingEditModal({...m,[key]:value,dirty:nd});};
          const unmergeAt=(parentIdx)=>{const next=[...rows];next[parentIdx]={...next[parentIdx],mergedParent:false,isMergedRange:false};let j=parentIdx+1;while(j<next.length&&next[j].mergedHidden){next[j]={...next[j],mergedHidden:false,mergedParent:false,isMergedRange:false,lessonTopic:"",centralFocus:"",learningObjectives:"",standards:"",type:"Instruction",breakLabel:""};j++;}commitRows(next);setPacingEditModal(null);setPacingSelectedRows(new Set());};
          const applyEdit=()=>{const next=[...rows];const dirty=m.dirty;indices.forEach(idx=>{const patch={};if(dirty.has("lessonTopic"))patch.lessonTopic=m.lessonTopic;if(dirty.has("centralFocus"))patch.centralFocus=m.centralFocus;if(dirty.has("learningObjectives"))patch.learningObjectives=m.learningObjectives;if(dirty.has("standards"))patch.standards=m.standards;if(dirty.has("type")&&m.type){const cfg=PACING_TYPE_CONFIG[m.type];patch.type=m.type;if(cfg&&cfg.wrap)patch.lessonTopic=cfg.wrap(stripMdFormatting(patch.lessonTopic!==undefined?patch.lessonTopic:(next[idx].lessonTopic||"")));}if(dirty.has("week"))patch.week=m.week;if(dirty.has("date"))patch.date=m.date;if(dirty.has("day"))patch.day=m.day;if(dirty.has("breakLabel"))patch.breakLabel=m.breakLabel;next[idx]={...next[idx],...patch};});commitRows(next);setPacingEditModal(null);setPacingSelectedRows(new Set());};
          return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setPacingEditModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:680,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:18,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\u270f\ufe0f"} Edit {indices.length} row{indices.length===1?"":"s"}</div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Leave a field blank to keep its existing value. Only fields you edit will be applied.</div>
              <div style={{flex:1,overflowY:"auto",paddingRight:4}}>
                <div style={{marginBottom:12,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2||"#f9fafb"}}>
                  <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Content Fields</div>
                  <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Lesson Topic</label>
                  <textarea value={m.lessonTopic} onChange={e=>setDirty("lessonTopic",e.target.value)} placeholder="Leave blank to keep existing value" rows={2} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text,resize:"vertical",fontFamily:"Tahoma,sans-serif",marginBottom:8}}/>
                  <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Central Focus</label>
                  <textarea value={m.centralFocus} onChange={e=>setDirty("centralFocus",e.target.value)} placeholder="Leave blank to keep existing value" rows={2} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text,resize:"vertical",fontFamily:"Tahoma,sans-serif",marginBottom:8}}/>
                  <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Learning Objectives</label>
                  <textarea value={m.learningObjectives} onChange={e=>setDirty("learningObjectives",e.target.value)} placeholder="Leave blank to keep existing value" rows={2} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text,resize:"vertical",fontFamily:"Tahoma,sans-serif",marginBottom:8}}/>
                  <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>MSCCRS</label>
                  <textarea value={m.standards} onChange={e=>setDirty("standards",e.target.value)} placeholder="Leave blank to keep existing value" rows={1} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text,resize:"vertical",fontFamily:"Tahoma,sans-serif"}}/>
                </div>
                <div style={{marginBottom:12,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2||"#f9fafb"}}>
                  <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Structural Fields</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div>
                      <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Type</label>
                      <select value={m.type} onChange={e=>setDirty("type",e.target.value)} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,background:T.surface,color:T.text}}>
                        <option value="">(no change)</option>
                        {PACING_ROW_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Week</label>
                      <input value={m.week} onChange={e=>setDirty("week",e.target.value)} placeholder="e.g., Term I 3" style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Date</label>
                      <input value={m.date} onChange={e=>setDirty("date",e.target.value)} placeholder="e.g., 7 Apr 26" style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Day</label>
                      <select value={m.day} onChange={e=>setDirty("day",e.target.value)} style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,background:T.surface,color:T.text}}>
                        <option value="">(no change)</option>
                        <option value="Mon">Mon</option><option value="Tue">Tue</option><option value="Wed">Wed</option><option value="Thu">Thu</option><option value="Fri">Fri</option>
                      </select>
                    </div>
                  </div>
                  <label style={{display:"block",fontSize:11,color:T.textMuted,marginBottom:2}}>Break Label (No Class rows only)</label>
                  <input value={m.breakLabel} onChange={e=>setDirty("breakLabel",e.target.value)} placeholder="e.g., Easter Monday" style={{width:"100%",padding:"6px 8px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:4,boxSizing:"border-box",background:T.surface,color:T.text}}/>
                </div>
                {mergedInSelection.length>0&&(<div style={{marginBottom:12,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2||"#f9fafb"}}>
                  <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Merged Ranges in Selection</div>
                  {mergedInSelection.map(idx=>(
                    <div key={idx} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,marginBottom:6,background:T.surface}}>
                      <div style={{fontSize:12,color:T.text}}>Row {idx+1}: <strong>{rows[idx].date||rows[idx].breakLabel||"(merged)"}</strong></div>
                      <button onClick={()=>unmergeAt(idx)} style={{background:"#f59e0b",color:"#fff",border:"none",borderRadius:4,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>Unmerge</button>
                    </div>
                  ))}
                  <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>Unmerge clears the merge flags on the range. The parent row keeps its content; child rows become blank Instruction rows with their original dates.</div>
                </div>)}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>setPacingEditModal(null)} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
                <button onClick={applyEdit} disabled={m.dirty.size===0} style={{background:m.dirty.size===0?"#9ca3af":"#0891b2",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:m.dirty.size===0?"default":"pointer",fontSize:13,fontWeight:"bold"}}>Apply {m.dirty.size} change{m.dirty.size===1?"":"s"}</button>
              </div>
            </div>
          </div>
        );})()}
        {showCreateModal&&<CreatePlansModal onConfirm={createPlans} onCancel={()=>setShowCreateModal(false)} savedPlans={savedPlans}/>}
        {gapDetailPlan&&(()=>{const plan=gapDetailPlan;const cc=COURSE_COLORS[plan.course]||{bg:"#6b7280"};const pct=Math.round(calcPlanCompletion(plan.planData)*100);const planGaps=[];DAYS.forEach(day=>{const d=plan.planData[day];if(!d||d.canceled)return;FIELDS.forEach(f=>{if(isFieldEmpty(d,f.key)){const w=FIELD_WEIGHTS[f.key]||1;planGaps.push({day,field:f.key,label:f.label,weight:w});}});});const byDay={};planGaps.forEach(g=>{if(!byDay[g.day])byDay[g.day]=[];byDay[g.day].push(g);});return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setGapDetailPlan(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:480,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:19,fontWeight:"bold",color:T.text}}>{plan.name}</span>
                <span style={{background:cc.bg,color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>{plan.course}</span>
              </div>
              <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>{pct}% complete</div>
              {planGaps.length===0?(<div style={{background:"#dcfce7",border:"1px solid #16a34a",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#15803d",marginBottom:16}}>No gaps — this plan is complete!</div>):(DAYS.map(day=>{const dg=byDay[day];if(!dg)return null;return(<div key={day} style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:"bold",color:T.textMuted,marginBottom:3}}>{day}</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{dg.map((g,j)=>{const sev=g.weight>=8?"#dc2626":g.weight>=5?"#d97706":"#6b7280";return <span key={j} style={{background:sev+"18",color:sev,border:`1px solid ${sev}40`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>{g.label}</span>;})}</div></div>);}))}
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:16}}>
                <button onClick={()=>setGapDetailPlan(null)} style={{background:T.surface2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 18px",cursor:"pointer",fontSize:13}}>Close</button>
                <button onClick={()=>{setGapDetailPlan(null);setPrevTab(activeTab);setEditingId(plan.id);lastOpenedPlanId.current=plan.id;}} style={{background:T.accentBlue,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Edit Plan</button>
              </div>
            </div>
          </div>);})()}
        {showResetModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:12}}>{"\ud83d\udd04"} Reset Lesson Plan</div>
              <div style={{fontSize:14,color:T.text,marginBottom:8}}>Are you sure you want to reset <strong>{showResetModal.name}</strong>?</div>
              <div style={{background:T.errorBg,border:`1px solid ${T.error}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:T.error,marginBottom:20}}>This will clear all lesson content (bell work, topics, vocabulary, objectives, etc.) back to empty defaults. Plan details (name, course, term, week) will be preserved. This cannot be undone.</div>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button onClick={()=>setShowResetModal(null)} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14}}>Cancel</button>
                <button onClick={()=>{resetPlan(showResetModal.id);setShowResetModal(null);}} style={{background:T.error,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>{"\ud83d\udd04"} Reset Plan</button>
              </div>
            </div>
          </div>
        )}
        {printPreviewHtml&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",zIndex:3000}} onClick={()=>setPrintPreviewHtml(null)}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:"#1a1a2e",borderBottom:"1px solid #333"}}>
              <div style={{fontSize:16,fontWeight:"bold",color:"#fff"}}>Print Preview</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={(e)=>{e.stopPropagation();printFromHtml(printPreviewHtml);}} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Print</button>
                <button onClick={()=>setPrintPreviewHtml(null)} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Close</button>
              </div>
            </div>
            <div onClick={e=>e.stopPropagation()} style={{flex:1,display:"flex",justifyContent:"center",overflow:"auto",padding:20,background:"#e5e7eb"}}>
              <iframe srcDoc={printPreviewHtml} onLoad={e=>{setTimeout(()=>{try{e.target.contentWindow.focus();e.target.contentWindow.print();}catch(err){}},500);}} style={{width:"100%",maxWidth:1200,height:"100%",border:"none",borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.3)",background:"#fff"}}/>
            </div>
          </div>
        )}
        {showCancelModal&&cancelModalPlan&&<CancelClassModal onConfirm={(days,reason,isHoliday)=>confirmCancelClass(cancelModalPlan,days,reason,isHoliday)} onCancel={()=>{setShowCancelModal(false);setCancelModalPlan(null);}}/>}
        {showEditDetailsModal&&(editingDetailsPlan||editingPlan)&&<EditDetailsModal plan={editingDetailsPlan||editingPlan} bulkMode={!!(editingDetailsPlan?._bulkIds)} onSave={(updates)=>saveEditDetails((editingDetailsPlan||editingPlan).id,updates)} onCancel={()=>{setShowEditDetailsModal(false);setEditingDetailsPlan(null);}}/>}
        {bulkExportPlans&&<ExportModal plans={bulkExportPlans} onClose={()=>setBulkExportPlans(null)} setAppModal={setAppModal}/>}
        {showImportModal&&<ImportModal savedPlans={savedPlans} setSavedPlans={setSavedPlans} persist={persist} onClose={()=>setShowImportModal(false)} setAppModal={setAppModal}/>}
        {completerJob&&(()=>{
          const j=completerJob;
          const elapsed=j.elapsedMs||0;
          const mm=Math.floor(elapsed/60000);const ss=Math.floor((elapsed%60000)/1000).toString().padStart(2,"0");
          const isRunning=j.status==="starting"||j.status==="running";
          const isError=j.status==="error";
          const isDone=j.status==="done"&&j.completedPlan;
          const handleFallback=()=>{
            const plan=savedPlans.find(p=>p.id===j.targetPlanId);
            closeCompleterModal();
            if(plan)setBulkExportPlans([plan]);
          };
          return(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3500}}>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:28,width:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
                <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\u2728"} {isRunning?"Completing Lesson Plan":isError?"Completion Failed":"Plan Ready to Apply"}</div>
                <div style={{fontSize:12,color:T.textMuted,marginBottom:16}}>Using the lesson-plan-completer skill via Claude CLI.</div>

                {isRunning&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"20px 0"}}>
                    <div style={{width:48,height:48,border:"4px solid #e5e7eb",borderTopColor:"#db2777",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                    <div style={{fontSize:28,fontWeight:"bold",color:T.text,fontVariantNumeric:"tabular-nums"}}>{mm}:{ss}</div>
                    <div style={{fontSize:13,color:T.textMuted,fontFamily:"monospace",textAlign:"center",maxWidth:480,minHeight:36,padding:"0 12px"}}>{j.statusLine||"Working\u2026"}</div>
                  </div>
                )}

                {isError&&(
                  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:16,marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:"bold",color:"#991b1b",marginBottom:6}}>Error</div>
                    <div style={{fontSize:12,color:"#991b1b",fontFamily:"monospace",wordBreak:"break-word"}}>{j.errorMessage||"Unknown error"}</div>
                    <div style={{fontSize:12,color:"#7f1d1d",marginTop:10}}>You can fall back to the manual export / chat workflow.</div>
                  </div>
                )}

                {isDone&&(
                  <div>
                    <div style={{fontSize:13,color:T.text,marginBottom:12}}>Completed in <b>{mm}:{ss}</b>. Choose how to apply it to your plan:</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button onClick={()=>applyCompletedPlan("replace")} style={{background:"#db2777",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                        <div>{"\ud83d\udd04"} Replace \u2014 overwrite this plan entirely</div>
                        <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Auto-backup is taken first. Undo (\u21a9) will revert.</div>
                      </button>
                      <button onClick={()=>applyCompletedPlan("fillEmpties")} style={{background:"#0369a1",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                        <div>{"\ud83e\uddfd"} Fill empties only \u2014 keep everything you already wrote</div>
                        <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Only blank text fields are filled. Existing content untouched.</div>
                      </button>
                      <button onClick={()=>applyCompletedPlan("smartMerge")} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"12px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold",textAlign:"left"}}>
                        <div>{"\ud83e\udde0"} Smart merge \u2014 fill empties + upgrade stubs</div>
                        <div style={{fontSize:11,fontWeight:"normal",opacity:0.9,marginTop:2}}>Also replaces short placeholder text like "TBD", "\u2026", "todo".</div>
                      </button>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18,flexWrap:"wrap"}}>
                  {isRunning&&<button onClick={cancelPlanCompletion} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>}
                  {isError&&<>
                    <button onClick={closeCompleterModal} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Close</button>
                    <button onClick={handleFallback} style={{background:"#0369a1",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Use Manual Export</button>
                  </>}
                  {isDone&&<button onClick={closeCompleterModal} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Discard</button>}
                </div>
              </div>
            </div>
          );
        })()}
        {appModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:4000}} onClick={()=>{if(appModal.onCancel){appModal.onCancel();}else{setAppModal(null);}}}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:appModal.compact?380:appModal.wide?520:440,maxHeight:appModal.compact?"85vh":"none",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:12}}>{appModal.icon||""}{appModal.icon?" ":""}{appModal.title||"Notice"}</div>
              {appModal.message&&<div style={{fontSize:14,color:T.text,marginBottom:appModal.subtitle?6:16,whiteSpace:"pre-line"}}>{appModal.message}</div>}
              {appModal.subtitle&&<div style={{fontSize:12,color:T.textMuted,marginBottom:16,fontStyle:"italic"}}>{appModal.subtitle}</div>}
              {appModal.warning&&<div style={{background:T.errorBg,border:`1px solid ${T.error}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:T.error,marginBottom:16}}>{appModal.warning}</div>}
              {appModal.info&&<div style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#1e3a8a",marginBottom:16}}>{appModal.info}</div>}
              {appModal.success&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#15803d",marginBottom:16}}>{appModal.success}</div>}
              {appModal.type==="prompt"&&(
                <input autoFocus value={appModal.inputValue||""} onChange={e=>setAppModal(m=>({...m,inputValue:e.target.value}))} placeholder={appModal.placeholder||""} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,boxSizing:"border-box",marginBottom:16,color:T.text}}/>
              )}
              {appModal.type==="select"&&appModal.options&&(
                <div ref={el=>{if(el&&appModal.scrollToIndex!=null){setTimeout(()=>{const btn=el.children[appModal.scrollToIndex];if(btn)btn.scrollIntoView({block:"center",behavior:"smooth"});},100);}}} style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,...(appModal.compact?{maxHeight:"65vh",overflowY:"auto",padding:"4px 0"}:{})}}>
                  {appModal.options.map((opt,i)=>(
                    <button key={i} onClick={()=>{setAppModal(null);if(opt.action)opt.action();}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 14px rgba(59,130,246,0.5)";e.currentTarget.style.filter="brightness(0.92)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.filter="none";}} style={{background:opt.bg||T.surface2,color:opt.color||T.text,border:opt.border||`1px solid ${T.border}`,borderLeft:opt.borderLeft||undefined,borderRadius:8,padding:"10px 16px",cursor:"pointer",fontSize:14,fontWeight:"bold",textAlign:"left",transition:"box-shadow 0.15s, filter 0.15s",fontStyle:opt.fontStyle||"normal",opacity:opt.opacity||1}}><div>{opt.label}</div>{opt.sublabel&&<div style={{fontSize:11,fontWeight:"normal",color:T.textMuted,whiteSpace:"pre-line",marginTop:2}}>{opt.sublabel}</div>}</button>
                  ))}
                </div>
              )}
              {appModal.type==="select"&&<button onClick={()=>setAppModal(null)} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"10px",cursor:"pointer",fontSize:14,width:"100%",marginBottom:8}}>Close</button>}
              {appModal.type==="dayPicker"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                  {DAYS.map((d,i)=>(
                    <button key={d} onClick={()=>{if(appModal.onDayPick)appModal.onDayPick(d);}} style={{background:DAY_COL_BG[d],border:`1px solid ${DAY_BORDER[d]}`,borderRadius:8,padding:"10px 16px",cursor:"pointer",fontSize:14,fontWeight:"bold",color:T.text,textAlign:"left"}}>{i+1}) {d}</button>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                {appModal.type!=="alert"&&appModal.type!=="select"&&<button onClick={()=>{if(appModal.onCancel){appModal.onCancel();}else{setAppModal(null);}}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14}}>Cancel</button>}
                {appModal.type==="alert"&&<button autoFocus onClick={()=>{if(appModal.onConfirm)appModal.onConfirm();setAppModal(null);}} style={{background:T.accentBlue,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>OK</button>}
                {appModal.type==="confirm"&&<button onClick={()=>{if(appModal.onConfirm)appModal.onConfirm();setAppModal(null);}} style={{background:appModal.confirmColor||T.accentBlue,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>{appModal.confirmLabel||"Confirm"}</button>}
                {appModal.type==="prompt"&&<button onClick={()=>{if(appModal.onConfirm)appModal.onConfirm(appModal.inputValue);setAppModal(null);}} style={{background:T.accentBlue,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>{appModal.confirmLabel||"OK"}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlansModal({onConfirm,onCancel,savedPlans}){
  const [term,setTerm]=useState(getDefaultTerm);
  const [termWeek,setTermWeek]=useState("");
  const weekOptions=useMemo(()=>buildWeekOptions(),[]);
  const defISO=useMemo(()=>weekToISO(defaultWeekStart()),[]);
  const [weekISO,setWeekISO]=useState(defISO);
  const [selected,setSelected]=useState(()=>COURSES.reduce((a,c)=>({...a,[c]:true}),{}));
  const selectedCourses=COURSES.filter(c=>selected[c]);
  const valid=selectedCourses.length>0;
  const toggle=(c)=>setSelected(p=>({...p,[c]:!p[c]}));

  const duplicates=useMemo(()=>{
    if(!savedPlans)return[];
    return selectedCourses.filter(c=>savedPlans.some(p=>p.course===c&&p.weekStart===weekISO));
  },[selectedCourses,weekISO,savedPlans]);

  const [showDupWarning,setShowDupWarning]=useState(false);

  const handleCreate=()=>{
    if(duplicates.length>0&&!showDupWarning){setShowDupWarning(true);return;}
    onConfirm({weekISO,termWeek,term,courses:selectedCourses});
  };

  const sel={width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,background:T.surface2,color:T.text,boxSizing:"border-box"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 32px 44px 32px",width:580,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"95vh",overflowY:"auto"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:6}}>Create Lesson Plans</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:18}}>Select classes and week settings. One plan is created per selected class.</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Term</label><select value={term} onChange={e=>setTerm(e.target.value)} style={sel}><option value="">— Select Term —</option>{TERMS.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Term Week</label><select value={termWeek} onChange={e=>setTermWeek(e.target.value)} style={sel}><option value="">— Select term week —</option>{TERM_WEEKS.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
          <div><label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Calendar Week</label><select value={weekISO} onChange={e=>{setWeekISO(e.target.value);setShowDupWarning(false);}} style={sel}>{weekOptions.map((d,idx)=><WeekOption key={idx} d={d}/>)}</select></div>
          <div>
            <label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:8}}>Classes ({selectedCourses.length} selected)</label>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {COURSES.map(c=>{
                const cc=COURSE_COLORS[c]||{bg:T.accentBlue,light:"#f0f0f0",text:"#333"};
                const isDup=duplicates.includes(c);
                return(
                  <label key={c} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"7px 12px",borderRadius:8,background:selected[c]?cc.light:T.surface2,border:`1px solid ${selected[c]?(isDup?"#f59e0b":cc.border):T.border}`,transition:"all 0.15s"}}>
                    <input type="checkbox" checked={selected[c]} onChange={()=>{toggle(c);setShowDupWarning(false);}} style={{accentColor:cc.bg,width:18,height:18}}/>
                    <span style={{fontWeight:"bold",color:selected[c]?cc.text:T.textMuted,fontSize:14}}>{c}</span>
                    {selected[c]&&<span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                      {isDup&&<span style={{background:"#fef3c7",color:"#92400e",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>Exists</span>}
                      <span style={{background:cc.bg,color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:"bold"}}>{(()=>{const tp=term&&termWeek?`${term} (${termWeek})`:(term||termWeek||"");return tp?`${tp}: ${c}`:c;})()}</span>
                    </span>}
                  </label>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={()=>{setSelected(COURSES.reduce((a,c)=>({...a,[c]:true}),{}));setShowDupWarning(false);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,color:T.accent}}>Select All</button>
              <button onClick={()=>{setSelected(COURSES.reduce((a,c)=>({...a,[c]:false}),{}));setShowDupWarning(false);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,color:T.textMuted}}>Deselect All</button>
            </div>
          </div>
        </div>

        {showDupWarning&&duplicates.length>0&&(
          <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginTop:16,fontSize:13,color:"#92400e"}}>
            <strong>Duplicate warning:</strong> {duplicates.join(", ")} already {duplicates.length===1?"has":"have"} a plan for this week. Create {duplicates.length===1?"a duplicate":"duplicates"} anyway?
          </div>
        )}

        <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:24}}>
          <button onClick={onCancel} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14}}>Cancel</button>
          <button onClick={handleCreate} disabled={!valid} style={{background:valid?(showDupWarning?"#f59e0b":"#16a34a"):"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:valid?"pointer":"default",fontSize:14,fontWeight:"bold"}}>{showDupWarning?`Create Anyway (${selectedCourses.length})`:`Create ${selectedCourses.length} Plan${selectedCourses.length!==1?"s":""}`}</button>
        </div>
      </div>
    </div>
  );
}

function CancelClassModal({onConfirm,onCancel}){
  const [selectedDays,setSelectedDays]=useState([]);
  const [reason,setReason]=useState("");
  const [isHoliday,setIsHoliday]=useState(false);
  const toggleDay=(d)=>setSelectedDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:500,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:6}}>{"\ud83d\udeab"} Cancel Class</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Select which day(s) to cancel and provide a reason (e.g. holiday name).</div>
        <div style={{fontSize:14,fontWeight:"bold",color:T.text,marginBottom:8}}>Which day(s)?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {DAYS.map(d=>{const sel=selectedDays.includes(d);return(
            <button key={d} onClick={()=>toggleDay(d)} style={{background:sel?"#3b82f6":"#f3f4f6",color:sel?"#fff":"#374151",border:`2px solid ${sel?"#3b82f6":"#d1d5db"}`,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:14,fontWeight:"bold",minWidth:80,textAlign:"center"}}>
              {d}{sel&&<div style={{fontSize:10,marginTop:2}}>{"\u2713"} selected</div>}
            </button>
          );})}
        </div>
        <div style={{fontSize:14,fontWeight:"bold",color:T.text,marginBottom:6}}>Reason for cancellation:</div>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder='e.g. "Thanksgiving Holiday" or "Teacher Workday"' style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:14,boxSizing:"border-box",marginBottom:12}}/>
        {selectedDays.length>0&&(
          <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#92400e",marginBottom:12}}>
            {"\u26a0\ufe0f"} All content in <strong>{selectedDays.join(", ")}</strong> will be cleared and marked as canceled. This can be undone.
          </div>
        )}
        <label style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 14px",background:"#f9fafb",border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",marginBottom:16}}>
          <input type="checkbox" checked={isHoliday} onChange={e=>setIsHoliday(e.target.checked)} style={{marginTop:3}}/>
          <span style={{fontSize:13,color:T.text}}>{"\ud83c\udf84"} Also save as a <strong>School Holiday</strong> (grays out this day on all plans + excludes from gap checks)</span>
        </label>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Cancel</button>
          <button onClick={()=>selectedDays.length>0&&onConfirm(selectedDays,reason,isHoliday)} disabled={selectedDays.length===0} style={{background:selectedDays.length>0?"#dc2626":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:selectedDays.length>0?"pointer":"default",fontSize:14,fontWeight:"bold"}}>{"\ud83d\udeab"} Cancel Class</button>
        </div>
      </div>
    </div>
  );
}

function EditDetailsModal({plan,onSave,onCancel,bulkMode}){
  const [course,setCourse]=useState(plan.course);
  const [term,setTerm]=useState(plan.term||"");
  const [termWeek,setTermWeek]=useState(plan.termWeek||"");
  const weekOptions=useMemo(()=>buildWeekOptions(),[]);
  const [weekISO,setWeekISO]=useState(plan.weekStart);
  const fld={fontSize:13,color:T.textMuted,display:"block",marginBottom:4,fontWeight:"bold"};
  const sel={width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,background:T.surface,color:T.text,boxSizing:"border-box"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:460,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:20}}>{"\u270f\ufe0f"} {bulkMode?`Edit Details (${plan._bulkIds?.length||1} plans)`:"Edit Plan Details"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={fld}>Course</label>
            <select value={course} onChange={e=>setCourse(e.target.value)} style={sel}>
              {COURSES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={fld}>Term</label>
            <select value={term} onChange={e=>setTerm(e.target.value)} style={sel}>
              <option value="">— Select Term —</option>
              {TERMS.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={fld}>Term Week</label>
            <select value={termWeek} onChange={e=>setTermWeek(e.target.value)} style={sel}>
              <option value="">— Select Term Week —</option>
              {TERM_WEEKS.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          {!bulkMode&&<div>
            <label style={fld}>Calendar Week</label>
            <select value={weekISO} onChange={e=>setWeekISO(e.target.value)} style={sel}>
              {weekOptions.map((d,i)=><WeekOption key={i} d={d}/>)}
            </select>
          </div>}
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:24}}>
          <button onClick={onCancel} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Cancel</button>
          <button onClick={()=>onSave({course,term,termWeek,weekISO})} style={{background:"#b45309",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}


// AI Edit Modal
function AIEditModal({day,field,label,currentText,course,pd,settings,onApply,onClose}){
  const [tone,setTone]=useState("");
  const [length,setLength]=useState("");
  const [customInstruction,setCustomInstruction]=useState("");
  const [previewText,setPreviewText]=useState("");
  const [loading,setLoading]=useState(false);
  const [generated,setGenerated]=useState(false);
  const [abortCtrl,setAbortCtrl]=useState(null);
  const hasContent=!!(currentText&&String(currentText).trim());
  const presetActions=[
    {label:"Shorten",icon:"\u2702\ufe0f",instruction:"Make this text more concise while keeping all key information."},
    {label:"Expand",icon:"\ud83d\udcc4",instruction:"Expand this text with more detail, examples, and specificity."},
    {label:"More Specific",icon:"\ud83c\udfaf",instruction:"Make this text more specific to the lesson topic, referencing concrete mathematical concepts and procedures."},
    {label:"Simplify Language",icon:"\ud83d\udca1",instruction:"Simplify the language for clarity while maintaining professional tone."},
    {label:"Fix Grammar",icon:"\u2705",instruction:"Fix grammar, spelling, and punctuation errors. Return the corrected text only."},
    {label:"Rewrite",icon:"\ud83d\udd04",instruction:"Completely rewrite this text with a fresh approach while keeping the same intent and content."},
  ];
  const toneOptions=[
    {label:"Formal",value:"formal",instruction:"Use a formal, professional academic tone."},
    {label:"Engaging",value:"engaging",instruction:"Use a warm, engaging tone that draws readers in."},
    {label:"Concise",value:"concise",instruction:"Use a direct, concise tone with no unnecessary words."},
    {label:"Detailed",value:"detailed",instruction:"Use a thorough, detailed tone that leaves nothing ambiguous."},
  ];
  const lengthOptions=[
    {label:"Shorter",value:"shorter",instruction:"Reduce the length by about 30%."},
    {label:"Same Length",value:"same",instruction:"Keep approximately the same length."},
    {label:"Longer",value:"longer",instruction:"Increase the length by about 30% with additional detail."},
  ];
  const buildInstruction=(presetInst=null)=>{
    const parts=[];
    if(presetInst)parts.push(presetInst);
    if(tone){const t=toneOptions.find(o=>o.value===tone);if(t)parts.push(t.instruction);}
    if(length){const l=lengthOptions.find(o=>o.value===length);if(l)parts.push(l.instruction);}
    if(customInstruction.trim())parts.push(customInstruction.trim());
    if(parts.length===0)parts.push(hasContent?`Edit and improve this ${label.toLowerCase()}.`:`Generate content for this ${label.toLowerCase()}.`);
    const base=hasContent?`Edit/improve this ${label.toLowerCase()}. Current text: "${currentText}"`:`Generate content for this ${label.toLowerCase()}.`;
    return `${base}\n\nInstructions: ${parts.join(" ")}`;
  };
  const runAI=async(presetInst=null)=>{
    if(settings.aiProvider!=="cli"&&!settings.apiKey)return;
    const ctrl=new AbortController();setAbortCtrl(ctrl);
    setLoading(true);setGenerated(false);
    try{
      const instruction=buildInstruction(presetInst);
      const result=await callAIRaw(day,field,pd,course,instruction,ctrl.signal);
      if(result){setPreviewText(result);setGenerated(true);}
    }catch(e){if(e.name!=='AbortError')console.error(e);}
    finally{setLoading(false);setAbortCtrl(null);}
  };
  const handleCancel=()=>{if(abortCtrl)abortCtrl.abort();onClose();};
  const chipStyle=(active)=>({background:active?"#7c3aed":"transparent",color:active?"#fff":T.text,border:`1px solid ${active?"#7c3aed":T.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold",transition:"all 0.15s"});
  const presetBtn={border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold",background:T.surface2,color:T.text,transition:"all 0.15s"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={e=>{if(e.target===e.currentTarget)handleCancel();}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:28,width:620,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:18,fontWeight:"bold",color:T.text}}>{"\u2728"} AI {hasContent?"Edit":"Generate"}: {label}</div><div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{day} — {course}</div></div>
          <button onClick={handleCancel} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:T.textMuted,padding:"4px 8px"}}>&times;</button>
        </div>

        {/* Quick Actions */}
        {hasContent&&<><div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Quick Actions</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {presetActions.map(a=><button key={a.label} disabled={loading} onClick={()=>runAI(a.instruction)} style={presetBtn}>{a.icon} {a.label}</button>)}
        </div></>}

        {/* Tone */}
        <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Tone / Style</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {toneOptions.map(o=><button key={o.value} onClick={()=>setTone(tone===o.value?"":o.value)} style={chipStyle(tone===o.value)}>{o.label}</button>)}
        </div>

        {/* Length */}
        <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Length</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {lengthOptions.map(o=><button key={o.value} onClick={()=>setLength(length===o.value?"":o.value)} style={chipStyle(length===o.value)}>{o.label}</button>)}
        </div>

        {/* Custom Instruction */}
        <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Custom Instructions</div>
        <textarea value={customInstruction} onChange={e=>setCustomInstruction(e.target.value)} placeholder="e.g., 'Add a reference to the Pythagorean Theorem' or 'Make it more aligned to SMP 3'..." rows={3} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:T.text,background:T.surface2,resize:"vertical",boxSizing:"border-box",marginBottom:16}}/>

        {/* Generate Button */}
        <button disabled={loading} onClick={()=>runAI()} style={{background:loading?"#888":"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",cursor:loading?"wait":"pointer",fontSize:14,fontWeight:"bold",marginBottom:16,width:"100%"}}>
          {loading?"\u23f3 Generating...":generated?"\ud83d\udd04 Regenerate":`\u2728 ${hasContent?"Edit with AI":"Generate with AI"}`}
        </button>

        {/* Preview */}
        {(generated||loading)&&<>
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Preview {generated&&<span style={{fontWeight:"normal",color:T.textMuted}}>(editable — make changes before applying)</span>}</div>
          <textarea value={previewText} onChange={e=>setPreviewText(e.target.value)} rows={10} disabled={loading} style={{width:"100%",border:`2px solid ${generated?"#7c3aed":T.border}`,borderRadius:8,padding:"12px",fontSize:13,color:T.text,background:loading?T.surface2:T.surface,resize:"vertical",boxSizing:"border-box",marginBottom:16,opacity:loading?0.5:1}}/>
        </>}

        {/* Action Buttons */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={handleCancel} style={{background:T.surface2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
          {generated&&<button onClick={()=>{onApply(previewText);onClose();}} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u2705"} Apply</button>}
        </div>
      </div>
    </div>
  );
}

// Batch AI modal — multi-cell generation via the Claude CLI backend and lesson-plan-completer skill
function BatchAIModal({selectedCells,pd,course,weekStartISO,termWeek,settings,FIELD_LABELS,onApply,onClose}){
  // Parse selected cells once into a stable ordered array
  const cellList=useMemo(()=>{
    const arr=[];
    const DAY_ORDER={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4};
    selectedCells.forEach(k=>{const [day,field]=k.split("::");arr.push({day,field,label:FIELD_LABELS[field]||field,currentText:pd[day]?.[field]||""});});
    arr.sort((a,b)=>(DAY_ORDER[a.day]-DAY_ORDER[b.day])||a.field.localeCompare(b.field));
    return arr;
  },[selectedCells,pd,FIELD_LABELS]);

  const [instruction,setInstruction]=useState("");
  const [tone,setTone]=useState("");
  const [lengthOpt,setLengthOpt]=useState("");
  const [mode,setMode]=useState("generate");
  const [jobId,setJobId]=useState(null);
  const [status,setStatus]=useState("idle"); // idle | running | done | error
  const [statusLine,setStatusLine]=useState("");
  const [elapsedMs,setElapsedMs]=useState(0);
  const [errorMsg,setErrorMsg]=useState("");
  const [resultCells,setResultCells]=useState([]);
  const [accepted,setAccepted]=useState(()=>new Set());
  const esRef=useRef(null);
  const timerRef=useRef(null);

  const presetActions=[
    {label:"Shorten",icon:"\u2702\ufe0f",instr:"Make the content more concise while keeping all key information."},
    {label:"Expand",icon:"\ud83d\udcc4",instr:"Expand the content with more detail, examples, and specificity."},
    {label:"More Specific",icon:"\ud83c\udfaf",instr:"Make the content more specific to the lesson topic, referencing concrete mathematical concepts."},
    {label:"Simplify",icon:"\ud83d\udca1",instr:"Simplify the language for clarity while maintaining professional tone."},
    {label:"Fix Grammar",icon:"\u2705",instr:"Fix grammar, spelling, and punctuation errors."},
    {label:"Rewrite",icon:"\ud83d\udd04",instr:"Completely rewrite the content with a fresh approach while keeping the same intent."},
  ];
  const toneOptions=[{label:"Formal",value:"formal",instr:"Use a formal, professional academic tone."},{label:"Engaging",value:"engaging",instr:"Use a warm, engaging tone that draws readers in."},{label:"Concise",value:"concise",instr:"Use a direct, concise tone."},{label:"Detailed",value:"detailed",instr:"Use a thorough, detailed tone."}];
  const lengthOptions=[{label:"Shorter",value:"shorter",instr:"Reduce the length by about 30%."},{label:"Longer",value:"longer",instr:"Increase the length by about 30%."}];

  const buildInstruction=(presetInstr=null)=>{
    const parts=[];
    if(presetInstr)parts.push(presetInstr);
    if(tone){const t=toneOptions.find(o=>o.value===tone);if(t)parts.push(t.instr);}
    if(lengthOpt){const l=lengthOptions.find(o=>o.value===lengthOpt);if(l)parts.push(l.instr);}
    if(instruction.trim())parts.push(instruction.trim());
    return parts.join(" ");
  };

  const start=async(presetInstr=null)=>{
    const fullInstr=buildInstruction(presetInstr);
    setStatus("running");setErrorMsg("");setStatusLine("Starting Claude CLI\u2026");setElapsedMs(0);
    const startedAt=Date.now();
    timerRef.current=setInterval(()=>setElapsedMs(Date.now()-startedAt),500);
    try{
      const plan={id:"batch",name:"Batch Edit",course,weekStart:weekStartISO||"",term:"",termWeek:termWeek||"",completed:false,planData:pd};
      const body={plan,cells:cellList.map(c=>({day:c.day,field:c.field,currentText:c.currentText})),instruction:fullInstr,mode};
      const resp=await fetch("http://localhost:5175/api/complete-cells",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!resp.ok){const err=await resp.json().catch(()=>({error:resp.statusText}));throw new Error(err.error||`HTTP ${resp.status}`);}
      const {jobId:jid}=await resp.json();
      setJobId(jid);
      const es=new EventSource(`http://localhost:5175/api/complete-cells/${jid}/events`);
      esRef.current=es;
      es.onmessage=(e)=>{
        try{
          const evt=JSON.parse(e.data);
          if(evt.type==="status"||evt.type==="stderr"){setStatusLine(evt.data?.message||"");}
          else if(evt.type==="error"){setStatus("error");setErrorMsg(evt.data?.message||"Unknown error");if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}es.close();}
          else if(evt.type==="done"){
            fetch(`http://localhost:5175/api/complete-cells/${jid}/result`).then(r=>r.json()).then(result=>{
              if(result.status==="done"&&Array.isArray(result.cells)){
                setResultCells(result.cells);
                setAccepted(new Set(result.cells.map(c=>`${c.day}::${c.field}`)));
                setStatus("done");
                setElapsedMs(result.elapsedMs||elapsedMs);
              }else{setStatus("error");setErrorMsg(result.message||"No cells returned");}
              if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
              es.close();
            }).catch(err=>{setStatus("error");setErrorMsg(err.message);if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}es.close();});
          }
        }catch{}
      };
    }catch(e){setStatus("error");setErrorMsg(e.message);if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}}
  };

  const cancel=async()=>{
    if(esRef.current){try{esRef.current.close();}catch{}esRef.current=null;}
    if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
    if(jobId){try{await fetch(`http://localhost:5175/api/complete-cells/${jobId}`,{method:"DELETE"});}catch{}}
    onClose();
  };

  useEffect(()=>()=>{if(esRef.current){try{esRef.current.close();}catch{}}if(timerRef.current)clearInterval(timerRef.current);},[]);

  const mm=Math.floor(elapsedMs/60000);
  const ss=Math.floor((elapsedMs%60000)/1000).toString().padStart(2,"0");
  const chipStyle=(active)=>({background:active?"#7c3aed":"transparent",color:active?"#fff":T.text,border:`1px solid ${active?"#7c3aed":T.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold"});
  const presetBtn={border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold",background:T.surface2,color:T.text};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3300}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:28,width:740,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 10px 50px rgba(0,0,0,0.35)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:18,fontWeight:"bold",color:T.text}}>{"\u2728"} Batch Generate with Skill ({cellList.length} cell{cellList.length===1?"":"s"})</div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{course} &middot; uses lesson-plan-completer skill via Claude CLI</div>
          </div>
          <button onClick={cancel} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:T.textMuted,padding:"4px 8px"}}>&times;</button>
        </div>

        {/* Selected cell chips */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16,padding:"10px 12px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:8,maxHeight:120,overflowY:"auto"}}>
          {cellList.map(c=>(
            <span key={`${c.day}-${c.field}`} style={{background:"#ede9fe",color:"#6d28d9",borderRadius:12,padding:"3px 10px",fontSize:11,fontWeight:"bold"}}>{c.day.slice(0,3)}: {c.label}{c.currentText?"":" \u2205"}</span>
          ))}
        </div>

        {status==="idle"&&<>
          {/* Mode */}
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Mode</div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>setMode("generate")} style={{...chipStyle(mode==="generate"),padding:"7px 16px"}}>Regenerate from scratch</button>
            <button onClick={()=>setMode("edit")} style={{...chipStyle(mode==="edit"),padding:"7px 16px"}}>Edit existing content</button>
          </div>

          {/* Quick actions */}
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Quick Actions</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {presetActions.map(a=><button key={a.label} onClick={()=>start(a.instr)} style={presetBtn}>{a.icon} {a.label}</button>)}
          </div>

          {/* Tone */}
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Tone / Style</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {toneOptions.map(o=><button key={o.value} onClick={()=>setTone(tone===o.value?"":o.value)} style={chipStyle(tone===o.value)}>{o.label}</button>)}
          </div>

          {/* Length */}
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Length</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {lengthOptions.map(o=><button key={o.value} onClick={()=>setLengthOpt(lengthOpt===o.value?"":o.value)} style={chipStyle(lengthOpt===o.value)}>{o.label}</button>)}
          </div>

          {/* Custom instruction */}
          <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:8}}>Custom Instruction (applied to all selected cells; skill adapts per field type)</div>
          <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="e.g., 'Keep each cell under 60 words and reference SMP 3'..." rows={3} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:T.text,background:T.surface2,resize:"vertical",boxSizing:"border-box",marginBottom:16}}/>

          <button onClick={()=>start()} style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",border:"none",borderRadius:8,padding:"11px 24px",cursor:"pointer",fontSize:14,fontWeight:"bold",width:"100%"}}>{"\u2728"} Generate {cellList.length} cell{cellList.length===1?"":"s"} with Skill</button>
        </>}

        {status==="running"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"30px 0"}}>
          <div style={{width:48,height:48,border:"4px solid #e5e7eb",borderTopColor:"#7c3aed",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
          <div style={{fontSize:28,fontWeight:"bold",color:T.text,fontVariantNumeric:"tabular-nums"}}>{mm}:{ss}</div>
          <div style={{fontSize:13,color:T.textMuted,fontFamily:"monospace",textAlign:"center",maxWidth:600,minHeight:36,padding:"0 16px"}}>{statusLine||"Working\u2026"}</div>
          <button onClick={cancel} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Cancel</button>
        </div>}

        {status==="error"&&<div>
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:16,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:"bold",color:"#991b1b",marginBottom:6}}>Batch failed</div>
            <div style={{fontSize:12,color:"#991b1b",fontFamily:"monospace",wordBreak:"break-word"}}>{errorMsg}</div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>{setStatus("idle");setErrorMsg("");}} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Back</button>
            <button onClick={onClose} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Close</button>
          </div>
        </div>}

        {status==="done"&&<div>
          <div style={{fontSize:13,color:T.text,marginBottom:12}}>Completed in <b>{mm}:{ss}</b>. Review each change and uncheck anything you don't want to apply.</div>
          <div style={{maxHeight:380,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8}}>
            {resultCells.map((rc,i)=>{
              const k=`${rc.day}::${rc.field}`;
              const before=(pd[rc.day]?.[rc.field]||"").trim();
              const label=FIELD_LABELS[rc.field]||rc.field;
              const isChecked=accepted.has(k);
              return(
                <div key={i} style={{padding:"12px 14px",borderBottom:i<resultCells.length-1?`1px solid ${T.border}`:"none",background:isChecked?T.surface:T.surface2,opacity:isChecked?1:0.6}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <input type="checkbox" checked={isChecked} onChange={()=>{setAccepted(p=>{const n=new Set(p);if(n.has(k))n.delete(k);else n.add(k);return n;});}} style={{width:16,height:16}}/>
                    <span style={{fontSize:13,fontWeight:"bold",color:T.text}}>{rc.day} &middot; {label}</span>
                  </div>
                  {before&&<div style={{fontSize:11,color:T.textMuted,background:"#fef2f2",borderLeft:"3px solid #fca5a5",padding:"6px 10px",marginBottom:6,whiteSpace:"pre-wrap"}}><b>Before:</b> {before}</div>}
                  <div style={{fontSize:12,color:T.text,background:"#f0fdf4",borderLeft:"3px solid #86efac",padding:"6px 10px",whiteSpace:"pre-wrap"}}><b>After:</b> {rc.text}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:16}}>
            <button onClick={onClose} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Discard</button>
            <button onClick={()=>onApply(resultCells,accepted)} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u2705"} Apply {accepted.size} cell{accepted.size===1?"":"s"}</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

// Simplified planner grid for preview
function DayProgress({pd,day}){
  const p=pd[day]||{};
  // Canceled days are excluded from the plan percentage (calcDayCompletion returns -1),
  // so drawing a 0% ring here would make the visible rings average to something lower
  // than the figure shown on the plan card and the Progress heatmap.
  if(p.canceled)return null;
  const total=COMPLETION_KEYS.length;
  const filled=COMPLETION_KEYS.filter(k=>!isFieldEmpty(p,k)).length;
  const pct=total>0?filled/total:0;
  const r=17,cx=21,cy=21,circ=2*Math.PI*r;
  const dayColor=DAY_BORDER[day]||"#6b7280";
  const pctText=Math.round(pct*100)+"%";
  return(<svg width={42} height={42} style={{position:"absolute",right:2,top:4}}><circle cx={cx} cy={cy} r={r} fill="none" stroke={dayColor} strokeWidth={3} strokeOpacity={0.35}/><circle cx={cx} cy={cy} r={r} fill="none" stroke={dayColor} strokeWidth={4.5} strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/><text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold" fill="#fff" stroke="#3a3a3a" strokeWidth={0.8} strokeOpacity={0.5}>{pctText}</text></svg>);
}

function SimplePlannerGrid({pd,setPD,course,weekStart,weekStartISO,termWeek,schoolHolidays=[],onRemoveHoliday,setAppModal,searchQuery="",searchMatches=[],searchMatchIndex=0,activeMatchRef,collapsedRows=new Set(),setCollapsedRows,settings={}}){
  const toggleRowCollapse=(key)=>{setCollapsedRows(prev=>{const next=new Set(prev);if(next.has(key))next.delete(key);else next.add(key);return next;});};

  const wDates=getWeekDates(weekStart);
  const updField=useCallback((day,f,v)=>setPD(p=>({...p,[day]:{...p[day],[f]:v}})),[setPD]);
  const [aiLoading,setAiLoading]=useState(null);
  const [aiEditModal,setAiEditModal]=useState(null);
  const [selectedCells,setSelectedCells]=useState(()=>new Set());
  const [batchModalOpen,setBatchModalOpen]=useState(false);
  const [ctxMenu,setCtxMenu]=useState(null); // {x,y,items:[{label,action}]}
  // Only text fields are eligible for multi-select / batch generation
  const BATCH_TEXT_FIELDS={lessonTitle:"Lesson Topic",keyVocab:"Key Vocabulary",objectives:"Learning Objectives",essentialQs:"Essential Questions",bellWorkText:"Bell Work",anticipatoryText:"Anticipatory Set",guidedPracticeText:"Guided Practice",indPracticeText:"Independent Practice",conclusionText:"Conclusion",centralFocus:"Central Focus",priorKnowledge:"Prior Knowledge",smps:"SMPs",msccrs:"MSCCRS"};
  const cellKey=(day,field)=>`${day}::${field}`;
  const isCellSelected=(day,field)=>selectedCells.has(cellKey(day,field));
  const toggleCellSelection=(day,field)=>{
    setSelectedCells(prev=>{const next=new Set(prev);const k=cellKey(day,field);if(next.has(k))next.delete(k);else next.add(k);return next;});
  };
  const clearCellSelection=()=>setSelectedCells(new Set());
  const selectRow=(field,emptyOnly=false)=>{
    setSelectedCells(prev=>{const next=new Set(prev);DAYS.forEach(d=>{if(pd[d]?.canceled)return;if(emptyOnly){const v=pd[d]?.[field];if(v&&String(v).trim())return;}next.add(cellKey(d,field));});return next;});
  };
  const selectColumn=(day,emptyOnly=false)=>{
    if(pd[day]?.canceled)return;
    setSelectedCells(prev=>{const next=new Set(prev);Object.keys(BATCH_TEXT_FIELDS).forEach(f=>{if(emptyOnly){const v=pd[day]?.[f];if(v&&String(v).trim())return;}next.add(cellKey(day,f));});return next;});
  };
  // Close context menu on any click outside
  useEffect(()=>{if(!ctxMenu)return;const close=()=>setCtxMenu(null);window.addEventListener("click",close);window.addEventListener("scroll",close,true);return()=>{window.removeEventListener("click",close);window.removeEventListener("scroll",close,true);};},[ctxMenu]);
  const [fmtSidebarOpen,setFmtSidebarOpen]=useState(false);
  const activeTaRef=useRef(null);
  const activeTaField=useRef(null);
  const activeTaDay=useRef(null);
  const handleCellFocus=(taRef,day,field)=>{setTimeout(()=>{activeTaRef.current=taRef?.current||null;},50);activeTaDay.current=day;activeTaField.current=field;};
  const handleCellBlur=()=>{setTimeout(()=>{if(document.activeElement&&(document.activeElement.hasAttribute("data-fmt-btn")||document.activeElement.closest("[data-fmt-sidebar]")))return;activeTaRef.current=null;activeTaDay.current=null;activeTaField.current=null;},200);};
  const wrapSelection=(wrapper)=>{const ta=activeTaRef.current;if(!ta)return;const start=ta.selectionStart,end=ta.selectionEnd;if(start===end)return;const text=ta.value;const selected=text.slice(start,end);const newText=text.slice(0,start)+wrapper+selected+wrapper+text.slice(end);const day=activeTaDay.current,field=activeTaField.current;if(day&&field)updField(day,field,newText);ta.focus();setTimeout(()=>{ta.selectionStart=start;ta.selectionEnd=end+wrapper.length*2;},0);};
  const wrapSelectionSug=(wrapper)=>{const ta=activeTaRef.current;if(!ta)return;const start=ta.selectionStart,end=ta.selectionEnd;if(start===end)return;const text=ta.value;const selected=text.slice(start,end);const newText=text.slice(0,start)+wrapper+selected+wrapper+text.slice(end);const field=activeTaField.current;if(field){setPD(prev=>{const next={...prev};DAYS.forEach(d=>{next[d]={...next[d],[field]:newText};});return next;});}ta.focus();setTimeout(()=>{ta.selectionStart=start;ta.selectionEnd=end+wrapper.length*2;},0);};
  const aiProviderReady=(settings.aiProvider==="cli"&&!HUB_ONLINE)||!!settings.apiKey;
  const openAiEdit=(day,field,label)=>{
    if(!aiProviderReady){setAppModal({type:"alert",icon:"\u2728",title:"AI Not Configured",warning:`Configure an AI provider in settings (Claude CLI, Gemini, or Anthropic).`});return;}
    const p=pd[day]||emptyDay();
    const currentText=p[field]||"";
    setAiEditModal({day,field,label,currentText});
  };
  // Unified sparkle-button click handler: shift-click toggles multi-select; plain click opens the Edit modal
  const handleSparkleClick=(e,day,field,label)=>{
    if(e&&e.shiftKey){e.preventDefault();e.stopPropagation();toggleCellSelection(day,field);return;}
    openAiEdit(day,field,label);
  };
  const applyAiEdit=(day,field,text)=>{
    updField(day,field,text);
    setPD(p=>({...p,[day]:{...p[day],aiGenerated:{...p[day]?.aiGenerated,[field]:true}}}));
  };
  const aiGenerate=useCallback(async(day,field,label,editInstruction=null)=>{
    if(!aiProviderReady){setAppModal({type:"alert",icon:"\u2728",title:"AI Not Configured",warning:`Configure an AI provider in settings (Claude CLI, Gemini, or Anthropic).`});return;}
    const loadKey=`${day}-${field}`;setAiLoading(loadKey);
    try{
      const result=await callAIRaw(day,field,pd,course,editInstruction);
      if(result){updField(day,field,result);setPD(p=>({...p,[day]:{...p[day],aiGenerated:{...p[day]?.aiGenerated,[field]:true}}}));}
      else setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"AI Generation Failed",warning:"No response from AI. Check your provider configuration and try again."});
    }catch(e){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"AI Error",warning:e.message});}
    finally{setAiLoading(null);}
  },[aiProviderReady,pd,course,updField,setAppModal]);
  const [dragDay,setDragDay]=useState(null);
  const [dragOverDay,setDragOverDay]=useState(null);
  const [dragCell,setDragCell]=useState(null);
  const [dragOverCell,setDragOverCell]=useState(null);
  const [otherModal,setOtherModal]=useState(null);

  const handleDayDrop=(targetDay)=>{
    if(!dragDay||dragDay===targetDay)return;
    const srcDay=dragDay;
    setAppModal({type:"select",icon:"\ud83d\udccb",title:`Copy ${srcDay} to ${targetDay}`,message:"How would you like to copy?",options:[
      {label:"\ud83d\udcc4 Copy & paste all (overwrite)",bg:"#eff6ff",color:"#1e3a8a",border:"#93c5fd",action:()=>setPD(p=>({...p,[targetDay]:JSON.parse(JSON.stringify(p[srcDay]))}))},
      {label:"\ud83d\udcc2 Copy into empty cells only",bg:"#f0fdf4",color:"#15803d",border:"#86efac",action:()=>setPD(p=>{const src=p[srcDay]||emptyDay();const tgt={...p[targetDay]};Object.keys(src).forEach(k=>{if(k==="canceled"||k==="aiGenerated")return;if(!tgt[k]||tgt[k]===""||tgt[k]===null||(Array.isArray(tgt[k])&&tgt[k].length===0))tgt[k]=JSON.parse(JSON.stringify(src[k]));});return{...p,[targetDay]:tgt};})},
      {label:"\u274c Cancel",bg:T.surface2,color:T.textMuted,border:T.border,action:()=>{}},
    ]});
    setDragDay(null);setDragOverDay(null);
  };

  const handleCellDrop=(targetDay,fieldKey)=>{
    if(!dragCell||dragCell.day===targetDay||dragCell.fieldKey!==fieldKey)return;
    const srcDay=dragCell.day;
    setAppModal({type:"confirm",icon:"\ud83d\udccb",title:"Copy Cell",message:`Copy ${srcDay}'s ${fieldKey} to ${targetDay}?`,confirmLabel:"Copy",onConfirm:()=>{setPD(p=>{const src=p[srcDay]||emptyDay();const val=src[fieldKey];return{...p,[targetDay]:{...p[targetDay],[fieldKey]:JSON.parse(JSON.stringify(val))}};});}});
    setDragCell(null);setDragOverCell(null);
  };

  const FIELD_KEYS_FOR_DRAG={lessonTitle:"lessonTitle",bellwork:"bellWorkType",textarea:null,anticipatory:"anticipatorySelected",guidedpractice:"guidedPracticeType",indpractice:"indPracticeType",conclusion:"conclusionText",accommodations:"accommodations",assessment:"assessment",hmw:"hmwSelected"};

  const isSearchMatch=(day,field)=>searchQuery&&searchMatches.some(m=>m.day===day&&m.field===field);
  const isActiveMatch=(day,field)=>searchQuery&&searchMatches[searchMatchIndex]&&searchMatches[searchMatchIndex].day===day&&searchMatches[searchMatchIndex].field===field;

  const s={
    cell:(day,canceled,highlight,searchHit,activeHit)=>({position:"relative",background:searchHit?(activeHit?"#fef9c3":"#fefce8"):highlight?"#dbeafe":canceled?"#f9fafb":DAY_COL_BG[day],border:activeHit?"2px solid #f59e0b":canceled?"2px dashed #d1d5db":`1px solid ${highlight?"#3b82f6":DAY_BORDER[day]}`,borderRadius:6,padding:"7px 9px",borderTop:activeHit?"2px solid #f59e0b":canceled?"2px dashed #9ca3af":`3px solid ${highlight?"#3b82f6":DAY_HDR_BG[day]}`,opacity:canceled?0.6:1}),
    ta:{width:"100%",border:`1px solid ${T.border}`,borderRadius:4,padding:"5px 7px",resize:"vertical",fontSize:14,fontFamily:"Tahoma,sans-serif",background:"#fff",color:T.text,boxSizing:"border-box",minHeight:"80px"},
    dd:{width:"100%",border:`1px solid ${T.border}`,borderRadius:4,padding:"5px 7px",fontSize:14,boxSizing:"border-box",background:"#fff",color:T.text},
    rowLabel:{background:"#3a3a3a",color:"#f0f0f0",padding:"8px",borderRadius:6,fontSize:14.3,fontWeight:"bold",textAlign:"center",verticalAlign:"middle",border:"1px solid #222",width:170},
  };
  const AIBadge=({day,fieldKey})=>{const aiKey=FIELD_AI_KEY[fieldKey];if(!aiKey||!pd[day]?.aiGenerated?.[aiKey])return null;return <span title="AI-generated" style={{position:"absolute",top:2,right:4,fontSize:10,opacity:0.85,cursor:"default",zIndex:1}}>{"\u2728"}</span>;};
  // Indicator for cells currently in the multi-select set — accepts either rowKey (maps via FIELD_TO_KEY) or the direct field name
  const SelectedBadge=({day,rowKey,field})=>{const f=field||FIELD_TO_KEY[rowKey]||rowKey;return isCellSelected(day,f)?<span title="Selected for batch (shift-click to toggle)" style={{position:"absolute",top:2,left:4,fontSize:10,background:"#7c3aed",color:"#fff",borderRadius:6,padding:"1px 5px",fontWeight:"bold",zIndex:2}}>{"\u2713"}</span>:null;};

  return(
    <div style={{background:T.bg,padding:"0 16px 24px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap'); * { font-family: Tahoma, sans-serif; }`}</style>
      <div style={{position:"relative",paddingTop:8}}>
        {/* Formatting sidebar — floats over left edge, matches Quota sidebar pattern */}
        {fmtSidebarOpen&&<div data-fmt-sidebar="true" style={{position:"fixed",left:0,top:290,zIndex:40,display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
          <button onClick={()=>setFmtSidebarOpen(false)} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:"0 6px 6px 0",padding:"8px 4px",cursor:"pointer",fontSize:11,fontWeight:"bold",writingMode:"vertical-rl"}} title="Close Formatting">Format</button>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"0 6px 6px 0",padding:"6px",display:"flex",flexDirection:"column",gap:6,boxShadow:"2px 2px 8px rgba(0,0,0,0.15)",marginTop:4}}>
            <button data-fmt-btn="true" tabIndex={-1} onMouseDown={e=>{e.preventDefault();wrapSelection("**");}} title="Bold" style={{background:"#4b5563",color:"#fff",border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontSize:15,fontWeight:"bold"}}>B</button>
            <button data-fmt-btn="true" tabIndex={-1} onMouseDown={e=>{e.preventDefault();wrapSelection("*");}} title="Italic" style={{background:"#4b5563",color:"#fff",border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontSize:15,fontStyle:"italic"}}>I</button>
            <button data-fmt-btn="true" tabIndex={-1} onMouseDown={e=>{e.preventDefault();wrapSelection("__");}} title="Underline" style={{background:"#4b5563",color:"#fff",border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontSize:15,textDecoration:"underline"}}>U</button>
            <div style={{height:1,background:T.border,margin:"2px 0"}}/>
            <button data-fmt-btn="true" tabIndex={-1} onMouseDown={e=>{e.preventDefault();wrapSelection("==");}} title="Yellow Highlight (Important)" style={{background:"#fef08a",color:"#1e1e1e",border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>Y</button>
            <button data-fmt-btn="true" tabIndex={-1} onMouseDown={e=>{e.preventDefault();wrapSelection("!!");}} title="Red Highlight (Critical)" style={{background:"#fecaca",color:"#1e1e1e",border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>R</button>
          </div>
        </div>}
        {!fmtSidebarOpen&&<button onClick={()=>setFmtSidebarOpen(true)} style={{position:"fixed",left:0,top:290,background:"#6b7280",color:"#fff",border:"none",borderRadius:"0 6px 6px 0",padding:"8px 4px",cursor:"pointer",fontSize:11,fontWeight:"bold",writingMode:"vertical-rl",zIndex:40}} title="Text Formatting">Format</button>}
        <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate",borderSpacing:6,width:"100%",minWidth:1110,tableLayout:"fixed"}}>
          <colgroup><col style={{width:"170px"}}/>{DAYS.map(d=><col key={d}/>)}</colgroup>
          <thead>
            <tr>
              <th style={{background:"#1a1a1a",color:"#f0f0f0",padding:"10px 8px",borderRadius:6,fontSize:16.5}}>{termWeek||"Week"}</th>
              {DAYS.map((day,i)=>{const canceled=pd[day]?.canceled;return(
                <th key={day} draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",day);setDragDay(day);}} onDragOver={e=>{e.preventDefault();setDragOverDay(day);}} onDragLeave={()=>setDragOverDay(null)} onDrop={e=>{e.preventDefault();setDragOverDay(null);handleDayDrop(day);}} onContextMenu={(e)=>{if(canceled)return;e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,items:[{label:`\u2728 Select all empty cells for ${day}`,action:()=>selectColumn(day,true)},{label:`\u2728 Select all cells for ${day}`,action:()=>selectColumn(day,false)}]});}} title="Right-click for batch options" style={{backgroundColor:dragOverDay===day?"#bfdbfe":canceled?"#e5e7eb":DAY_HDR_BG[day],color:canceled?"#6b7280":"#1e2a3a",padding:"10px 8px",borderRadius:6,fontSize:14,textAlign:"center",border:canceled?"2px dashed #9ca3af":`2px solid ${dragOverDay===day?"#3b82f6":DAY_BORDER[day]}`,position:"relative",cursor:"grab"}}>
                  <DayProgress pd={pd} day={day}/>
                  <div style={{fontWeight:"bold",fontSize:17}}>{day}</div>
                  <div style={{fontWeight:"bold",fontSize:14,opacity:0.8}}>{formatDate(wDates[i])}</div>
                  {canceled&&<div><button onClick={()=>{if(pd[day]?.canceled?.isHoliday&&onRemoveHoliday&&weekStartISO)onRemoveHoliday(getDayISO(weekStartISO,day));setPD(prev=>({...prev,[day]:{...prev[day],canceled:null}}));}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:11,fontWeight:"bold",marginTop:4}}>{"\u21a9"} Restore Day</button></div>}
                  {!canceled&&weekStartISO&&schoolHolidays.includes(getDayISO(weekStartISO,day))&&<div style={{fontSize:11,color:"#92400e",fontWeight:"bold",marginTop:2}}>{"\ud83c\udf84"} School Holiday</div>}
                </th>
              );})}
            </tr>
          </thead>
          <tbody>
            {EDIT_TAB_FIELDS.map(({key,label,type,fused})=>{const isCollapsed=collapsedRows.has(key);return(<React.Fragment key={key}>
              <tr style={{verticalAlign:"top"}}>
                <td onClick={()=>toggleRowCollapse(key)} onContextMenu={(e)=>{const rowField=FIELD_TO_KEY[key]||key;if(!BATCH_TEXT_FIELDS[rowField])return;e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,items:[{label:`\u2728 Select all 5 days for ${label}`,action:()=>selectRow(rowField,false)},{label:`\u2728 Select empty days only for ${label}`,action:()=>selectRow(rowField,true)}]});}} onMouseEnter={e=>{e.currentTarget.style.background="#4a4a4a";}} onMouseLeave={e=>{e.currentTarget.style.background="#3a3a3a";}} style={{...s.rowLabel,cursor:"pointer",...(isCollapsed?{padding:"4px 8px",opacity:0.5}:{})}} title="Right-click for batch options">{label}</td>
                {DAYS.map(day=>{
                  const p=pd[day]||emptyDay();
                  const cellDragKey=type==="textarea"?key:(FIELD_KEYS_FOR_DRAG[type]||key);
                  const isDragOver=dragOverCell&&dragOverCell.day===day&&dragOverCell.fieldKey===cellDragKey;
                  const searchFields=type==="lessonTitle"?["lessonTitle"]:type==="bellwork"?["bellWorkText"]:type==="textarea"?[key]:type==="anticipatory"?["anticipatoryText"]:type==="guidedpractice"?["guidedPracticeText"]:type==="indpractice"?["indPracticeText"]:type==="conclusion"?["conclusionText"]:type==="hmw"?["hmwText"]:[];
                  const cellSearchHit=searchFields.some(f=>isSearchMatch(day,f));
                  const cellActiveHit=searchFields.some(f=>isActiveMatch(day,f));
                  return(
                    <td key={day} ref={cellActiveHit?activeMatchRef:undefined} style={{padding:3}} draggable onDragStart={e=>{e.stopPropagation();setDragCell({day,fieldKey:cellDragKey});e.dataTransfer.setData("text/plain",`${day}:${cellDragKey}`);}} onDragOver={e=>{e.preventDefault();e.stopPropagation();if(dragCell&&dragCell.fieldKey===cellDragKey&&dragCell.day!==day)setDragOverCell({day,fieldKey:cellDragKey});}} onDragLeave={()=>setDragOverCell(null)} onDrop={e=>{e.preventDefault();e.stopPropagation();setDragOverCell(null);if(dragCell)handleCellDrop(day,cellDragKey);}}>
                      <div onClick={isCollapsed?e=>{e.stopPropagation();toggleRowCollapse(key);const td=e.currentTarget.parentElement;setTimeout(()=>{const inp=td.querySelector("textarea,input,select");if(inp)inp.focus();},250);}:undefined} style={{maxHeight:isCollapsed?30:2000,overflow:"hidden",opacity:isCollapsed?0.4:1,transition:"max-height 200ms ease, opacity 200ms ease",cursor:isCollapsed?"pointer":"auto"}}>
                      {type==="lessonTitle"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="lessonTitle"/><SelectedBadge day={day} field="lessonTitle"/>
                          {p.canceled?(
                            <div style={{textAlign:"center",padding:"12px 4px"}}>
                              <div style={{fontSize:28}}>{"\ud83d\udeab"}</div>
                              <div style={{fontWeight:"bold",color:"#dc2626",fontSize:14}}>No Classes</div>
                              {p.canceled.reason&&p.canceled.reason!=="Canceled"&&<div style={{fontStyle:"italic",color:"#6b7280",fontSize:12,marginTop:2}}>{p.canceled.reason}</div>}
                              <button onClick={()=>{if(pd[day]?.canceled?.isHoliday&&onRemoveHoliday&&weekStartISO)onRemoveHoliday(getDayISO(weekStartISO,day));setPD(prev=>({...prev,[day]:{...prev[day],canceled:null}}));}} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:4,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:"bold",marginTop:8}}>{"\u21a9"} Restore Day</button>
                            </div>
                          ):(
                            <>
                              <textarea id={`lt-${day}`} value={p.lessonTitle||""} onChange={e=>updField(day,"lessonTitle",e.target.value)} rows={p.lessonTitle?6:2} placeholder="Enter lesson topic..." style={{...s.ta,fontWeight:"bold",minHeight:"42px"}}/>
                              <CellActions text={p.lessonTitle} has={!!(p.lessonTitle||"").trim()} onOptions={(e)=>handleSparkleClick(e,day,"lessonTitle","Lesson Topic")} setAppModal={setAppModal}/>
                            </>
                          )}
                        </div>
                      )}
                      {type==="bellwork"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="bellWork"/><SelectedBadge day={day} field="bellWorkText"/>
                          <select value={p.bellWorkType} onChange={e=>{updField(day,"bellWorkType",e.target.value);if(BELL_WORK_TEXT[e.target.value])updField(day,"bellWorkText",BELL_WORK_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Bell Work —</option>
                            {BELL_WORK_OPTIONS.map(o=><option key={o} value={o} title={BELL_WORK_TEXT[o]||o}>{o}</option>)}
                          </select>
                          {p.bellWorkText&&<FormattedCell value={p.bellWorkText} onChange={v=>updField(day,"bellWorkText",v)} rows={14} placeholder="Enter bell work..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"bellWorkText")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.bellWorkText} has={!!(p.bellWorkText||p.bellWorkType)} onOptions={(e)=>handleSparkleClick(e,day,"bellWorkText","Bell Work")} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="textarea"&&(fused?(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          {(()=>{
                            const [top,bottom]=fused;
                            const topVal=(p[top.key]||"").trim(),bottomVal=(p[bottom.key]||"").trim();
                            // Shown as one block: MSCCRS, a blank line, then the objectives.
                            const joined=[topVal,bottomVal].filter(Boolean).join("\n\n");
                            // Split back on the FIRST blank line. MSCCRS values are single-line
                            // codes, so the first paragraph is unambiguously the standard.
                            const onChange=(v)=>{
                              const seg=String(v).split(/\n[ \t]*\n/);
                              updField(day,top.key,(seg[0]||"").trim());
                              updField(day,bottom.key,seg.slice(1).join("\n\n").trim());
                            };
                            return(<>
                              <AIBadge day={day} fieldKey={bottom.key}/><SelectedBadge day={day} field={bottom.key}/>
                              <FormattedCell value={joined} onChange={onChange} rows={joined?11:4} placeholder={"MSCCRS code(s)\n\nLearning objectives..."} style={s.ta} onFocus={r=>handleCellFocus(r,day,bottom.key)} onBlur={handleCellBlur}/>
                              <CellActions text={joined} setAppModal={setAppModal} options={fused.map(sf=>({label:sf.label,has:!!(p[sf.key]||"").trim(),onClick:(e)=>handleSparkleClick(e,day,sf.key,sf.label)}))}/>
                            </>);
                          })()}
                        </div>
                      ):(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey={key}/><SelectedBadge day={day} field={key}/>
                          <FormattedCell value={p[key]||""} onChange={v=>updField(day,key,v)} rows={p[key]?(key==="keyVocab"?7:12):4} placeholder={`Enter ${label.toLowerCase()}...`} style={s.ta} onFocus={r=>handleCellFocus(r,day,key)} onBlur={handleCellBlur}/>
                          {(()=>{
                            const has=!!(p[key]&&String(p[key]).trim());
                            // Only fields with an AI prompt behind them get Options; the rest (e.g. Lesson) get Copy alone.
                            const aiCapable=["centralFocus","priorKnowledge","keyVocab","objectives","essentialQs","smps","msccrs"].includes(key);
                            return <CellActions text={p[key]} has={has} onOptions={aiCapable?(e)=>handleSparkleClick(e,day,key,label):null} setAppModal={setAppModal}/>;
                          })()}
                        </div>
                      ))}
                      {type==="anticipatory"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="anticipatorySet"/><SelectedBadge day={day} field="anticipatoryText"/>
                          <select value={p.anticipatorySelected?.[0]||""} onChange={e=>{updField(day,"anticipatorySelected",e.target.value?[e.target.value]:[]);if(ANTICIPATORY_SET_TEXT[e.target.value])updField(day,"anticipatoryText",ANTICIPATORY_SET_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Anticipatory Set —</option>
                            {ANTICIPATORY_SET_OPTIONS.map(o=><option key={o} value={o} title={ANTICIPATORY_SET_TEXT[o]||o}>{o}</option>)}
                          </select>
                          {p.anticipatoryText&&<FormattedCell value={p.anticipatoryText} onChange={v=>updField(day,"anticipatoryText",v)} rows={14} placeholder="Enter anticipatory set..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"anticipatoryText")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.anticipatoryText} has={!!(p.anticipatoryText||p.anticipatorySelected?.length>0)} onOptions={(e)=>handleSparkleClick(e,day,"anticipatoryText","Anticipatory Set")} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="guidedpractice"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="guidedPractice"/><SelectedBadge day={day} field="guidedPracticeText"/>
                          <select value={p.guidedPracticeType} onChange={e=>{updField(day,"guidedPracticeType",e.target.value);if(GUIDED_PRACTICE_TEXT[e.target.value])updField(day,"guidedPracticeText",GUIDED_PRACTICE_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Guided Practice —</option>
                            {GUIDED_PRACTICE_OPTIONS.map(o=><option key={o} value={o} title={GUIDED_PRACTICE_TEXT[o]||o}>{o}</option>)}
                          </select>

                          {p.guidedPracticeText&&<FormattedCell value={p.guidedPracticeText} onChange={v=>updField(day,"guidedPracticeText",v)} rows={14} placeholder="Enter guided practice..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"guidedPracticeText")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.guidedPracticeText} has={!!(p.guidedPracticeText||p.guidedPracticeType)} onOptions={(e)=>handleSparkleClick(e,day,"guidedPracticeText","Guided Practice")} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="indpractice"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="independentPractice"/><SelectedBadge day={day} field="indPracticeText"/>
                          <select value={p.indPracticeType} onChange={e=>{updField(day,"indPracticeType",e.target.value);if(INDEPENDENT_PRACTICE_TEXT[e.target.value])updField(day,"indPracticeText",INDEPENDENT_PRACTICE_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Independent Practice —</option>
                            {INDEPENDENT_PRACTICE_OPTIONS.map(o=><option key={o} value={o} title={INDEPENDENT_PRACTICE_TEXT[o]||o}>{o}</option>)}
                          </select>
                          {p.indPracticeText&&<FormattedCell value={p.indPracticeText} onChange={v=>updField(day,"indPracticeText",v)} rows={14} placeholder="Enter independent practice..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"indPracticeText")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.indPracticeText} has={!!(p.indPracticeText||p.indPracticeType)} onOptions={(e)=>handleSparkleClick(e,day,"indPracticeText","Independent Practice")} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="lesson"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <SelectedBadge day={day} field="lesson"/>
                          <select value={p.lessonType||""} onChange={e=>{updField(day,"lessonType",e.target.value);if(LESSON_TEXT[e.target.value])updField(day,"lesson",LESSON_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Lesson —</option>
                            {LESSON_OPTIONS.map(o=><option key={o} value={o} title={LESSON_TEXT[o]||o}>{o}</option>)}
                          </select>
                          {p.lesson&&<FormattedCell value={p.lesson} onChange={v=>updField(day,"lesson",v)} rows={14} placeholder="Enter lesson..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"lesson")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.lesson} has={!!(p.lesson||p.lessonType)} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="conclusion"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <AIBadge day={day} fieldKey="conclusion"/><SelectedBadge day={day} field="conclusionText"/>
                          <select value={p.conclusionType||""} onChange={e=>{updField(day,"conclusionType",e.target.value);if(CONCLUSION_TEXT[e.target.value])updField(day,"conclusionText",CONCLUSION_TEXT[e.target.value]);}} style={s.dd}>
                            <option value="">— Select Exit Ticket & Conclusion —</option>
                            {CONCLUSION_OPTIONS.map(o=><option key={o} value={o} title={CONCLUSION_TEXT[o]||o}>{o}</option>)}
                          </select>
                          {p.conclusionText&&<FormattedCell value={p.conclusionText} onChange={v=>updField(day,"conclusionText",v)} rows={14} placeholder="Enter exit ticket & conclusion..." style={{...s.ta,marginTop:6}} onFocus={r=>handleCellFocus(r,day,"conclusionText")} onBlur={handleCellBlur}/>}
                          <CellActions text={p.conclusionText} has={!!(p.conclusionText||p.conclusionType)} onOptions={(e)=>handleSparkleClick(e,day,"conclusionText","Exit Ticket & Conclusion")} setAppModal={setAppModal}/>
                        </div>
                      )}
                      {type==="accommodations"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          {ACCOMMODATIONS.map(({key:ak,label:al})=>(
                            <label key={ak} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.text,marginBottom:3}}>
                              <input type="checkbox" checked={!!p.accommodations?.[ak]} onChange={e=>setPD(prev=>({...prev,[day]:{...prev[day],accommodations:{...prev[day].accommodations,[ak]:e.target.checked}}}))}/>
                              {al}
                            </label>
                          ))}
                          {(p.accommodations?.accOthers||[]).map((item,idx)=>(
                            <label key={`ao-${idx}`} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.text,marginBottom:3}}>
                              <input type="checkbox" checked readOnly/>{item}
                              <span onClick={()=>setPD(prev=>{const accs={...prev[day].accommodations};accs.accOthers=accs.accOthers.filter((_,j)=>j!==idx);return{...prev,[day]:{...prev[day],accommodations:accs}};})} style={{color:"#dc2626",cursor:"pointer",fontSize:11,marginLeft:4}}>&times;</span>
                            </label>
                          ))}
                          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.textMuted,fontStyle:"italic",marginBottom:3}} onClick={()=>setOtherModal({type:"accommodation",day})}>
                            <input type="checkbox" checked={false} readOnly style={{cursor:"pointer"}}/>Other...
                          </label>
                          {/* Copies the checked accommodations (built-in labels first, then any
                              custom "Other..." entries) as one "; "-separated line. Reuses
                              CellActions so the button matches every other row and an empty
                              selection raises the same "Nothing to Copy" modal. */}
                          {(()=>{
                            const picked=[
                              ...ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label),
                              ...(p.accommodations?.accOthers||[]),
                            ];
                            return <CellActions text={picked.join("; ")} has={picked.length>0} setAppModal={setAppModal}/>;
                          })()}
                        </div>
                      )}
                      {type==="assessment"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          <div style={{fontSize:13,marginBottom:4}}><strong style={{color:T.accentBlue}}>Formative:</strong></div>
                          {FORMATIVE_OPTIONS.map(opt=>(
                            <label key={opt} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.text,marginBottom:2}}>
                              <input type="checkbox" checked={(p.assessment?.form||[]).includes(opt)} onChange={e=>{const cur=p.assessment?.form||[];const next=e.target.checked?[...cur,opt]:cur.filter(v=>v!==opt);setPD(prev=>({...prev,[day]:{...prev[day],assessment:{...prev[day].assessment,form:next}}}));}}/>
                              {opt}
                            </label>
                          ))}
                          {(p.assessment?.formOthers||[]).map((item,idx)=>(
                            <label key={`fo-${idx}`} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.text,marginBottom:2}}>
                              <input type="checkbox" checked readOnly/>{item}
                              <span onClick={()=>setPD(prev=>{const a={...prev[day].assessment};a.formOthers=a.formOthers.filter((_,j)=>j!==idx);return{...prev,[day]:{...prev[day],assessment:a}};})} style={{color:"#dc2626",cursor:"pointer",fontSize:11,marginLeft:4}}>&times;</span>
                            </label>
                          ))}
                          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.textMuted,fontStyle:"italic",marginBottom:2}} onClick={()=>setOtherModal({type:"formative",day})}>
                            <input type="checkbox" checked={false} readOnly style={{cursor:"pointer"}}/>Other...
                          </label>
                          <div style={{fontSize:13,marginTop:8,marginBottom:4}}><strong style={{color:T.accentBlue}}>Summative:</strong></div>
                          <input value={p.assessment?.quizName||""} onChange={e=>setPD(prev=>({...prev,[day]:{...prev[day],assessment:{...prev[day].assessment,quizName:e.target.value}}}))} placeholder="Summative assessment name" style={{...s.dd,marginBottom:4}}/>
                          <input value={p.assessment?.quizDate||""} onChange={e=>setPD(prev=>({...prev,[day]:{...prev[day],assessment:{...prev[day].assessment,quizDate:e.target.value}}}))} placeholder="Date" style={s.dd}/>
                        </div>
                      )}
                      {type==="hmw"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          {HMW_OPTIONS.map(opt=>{
                            const displayLabel=opt==="Study for Summative"?`Study for "${p.assessment?.quizName||'[Summative Assessment]'}"`:opt;
                            return(
                            <label key={opt} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.text,marginBottom:3}}>
                              <input type="checkbox" checked={(p.hmwSelected||["None"]).includes(opt)} onChange={e=>{let cur=[...(p.hmwSelected||["None"])];if(opt==="None"){cur=e.target.checked?["None"]:[];}else{cur=cur.filter(v=>v!=="None");cur=e.target.checked?[...cur,opt]:cur.filter(v=>v!==opt);if(!cur.length)cur=["None"];}updField(day,"hmwSelected",cur);}}/>
                              {displayLabel}
                            </label>
                          );})}
                          {(p.hmwOthers||[]).map((item,idx)=>(
                            <label key={`ho-${idx}`} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.text,marginBottom:3}}>
                              <input type="checkbox" checked readOnly/>{item}
                              <span onClick={()=>setPD(prev=>{const hmwO=[...(prev[day].hmwOthers||[])];hmwO.splice(idx,1);return{...prev,[day]:{...prev[day],hmwOthers:hmwO}};})} style={{color:"#dc2626",cursor:"pointer",fontSize:11,marginLeft:4}}>&times;</span>
                            </label>
                          ))}
                          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:T.textMuted,fontStyle:"italic",marginBottom:3}} onClick={()=>setOtherModal({type:"homework",day})}>
                            <input type="checkbox" checked={false} readOnly style={{cursor:"pointer"}}/>Other...
                          </label>
                        </div>
                      )}
                      {type==="links"&&(
                        <div style={s.cell(day,p.canceled,isDragOver,cellSearchHit,cellActiveHit)}>
                          {(()=>{
                            // Two fields are always offered; the array itself stays empty until
                            // something is typed, so a blank cell does not persist empty strings.
                            const stored=Array.isArray(p.helpfulLinks)?p.helpfulLinks:[];
                            const links=stored.length>=2?stored:[...stored,...Array(2-stored.length).fill("")];
                            const setLinks=next=>setPD(prev=>({...prev,[day]:{...prev[day],helpfulLinks:next.some(u=>u.trim())?next:[]}}));
                            const inputStyle={flex:1,minWidth:0,fontSize:12,padding:"4px 6px",borderRadius:4,border:`1px solid ${T.border}`,background:T.inputBg||T.surface,color:T.text};
                            return(<>
                              {links.map((url,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                                  <input type="url" value={url} placeholder="https://..." spellCheck={false}
                                    onChange={e=>{const n=[...links];n[i]=e.target.value;setLinks(n);}}
                                    style={inputStyle}/>
                                  {url.trim()&&(
                                    <a href={url} target="_blank" rel="noopener noreferrer" title="Open link in a new tab" style={{textDecoration:"none",fontSize:13,color:T.accentBlue||"#2563eb",flexShrink:0}}>{"↗"}</a>
                                  )}
                                  {links.length>2&&(
                                    <span onClick={()=>setLinks(links.filter((_,j)=>j!==i))} title="Remove this link" style={{cursor:"pointer",color:T.error,fontWeight:"bold",fontSize:14,flexShrink:0}}>{"×"}</span>
                                  )}
                                </div>
                              ))}
                              <button onClick={()=>setLinks([...links,""])} style={{background:"none",border:`1px dashed ${T.border}`,borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:T.textMuted,marginTop:2}}>+ Add link</button>
                            </>);
                          })()}
                        </div>
                      )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>);})}
            {/* Weekly Objectives — one field spanning Mon-Fri rather than a cell per day.
                The value is written to all five days so it travels with planData like every
                other field (same approach the old merged suggestion rows used); Monday is
                the copy that gets read back. Sits below Homework and is deliberately outside
                COMPLETION_KEYS, so it does not affect the progress percentages. */}
            {(()=>{const key="weeklyObjectives";const isCollapsed=collapsedRows.has(key);const val=pd.Monday?.[key]||"";return(
              <tr key={key} style={{verticalAlign:"top"}}>
                <td onClick={()=>toggleRowCollapse(key)} onMouseEnter={e=>{e.currentTarget.style.background="#4a4a4a";}} onMouseLeave={e=>{e.currentTarget.style.background="#3a3a3a";}} style={{...s.rowLabel,cursor:"pointer",...(isCollapsed?{padding:"4px 8px",opacity:0.5}:{})}}>Weekly Objectives</td>
                <td colSpan={5} style={{padding:3}}>
                  <div style={{maxHeight:isCollapsed?30:2000,overflow:"hidden",opacity:isCollapsed?0.4:1,transition:"max-height 200ms ease, opacity 200ms ease",cursor:isCollapsed?"pointer":"auto"}} onClick={isCollapsed?()=>toggleRowCollapse(key):undefined}>
                    <FormattedCell value={val} onChange={v=>{setPD(prev=>{const next={...prev};DAYS.forEach(d=>{next[d]={...next[d],[key]:v};});return next;});}} rows={val?8:4} placeholder="Summarize the standards and objectives covered across the week..." style={s.ta}/>
                    <CellActions text={val} has={!!val.trim()} setAppModal={setAppModal}/>
                  </div>
                </td>
              </tr>
            );})()}
            {/* Suggestion rows (Differentiation Tiers / Pacing Warnings / Enhancement
                Suggestions) are intentionally not rendered in the Edit Lesson Plan tab.
                SUGGESTION_FIELDS itself is unchanged so the data still round-trips. */}
          </tbody>
        </table>
      </div>
      </div>
      <div style={{textAlign:"center",padding:"16px 0 28px",color:T.textMuted,fontSize:13}}>Dr. Derrick DeMars &middot; Innova Preparatory School, Hattiesburg, MS</div>
      {aiEditModal&&<AIEditModal day={aiEditModal.day} field={aiEditModal.field} label={aiEditModal.label} currentText={aiEditModal.currentText} course={course} pd={pd} settings={settings} onApply={(text)=>applyAiEdit(aiEditModal.day,aiEditModal.field,text)} onClose={()=>setAiEditModal(null)}/>}
      {/* Floating multi-select action bar */}
      {selectedCells.size>0&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#fff",borderRadius:12,boxShadow:"0 10px 40px rgba(0,0,0,0.35)",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,zIndex:3100,border:"1px solid #374151"}}>
          <span style={{fontSize:13,fontWeight:"bold"}}>{selectedCells.size} cell{selectedCells.size===1?"":"s"} selected</span>
          {!HUB_ONLINE&&<button onClick={()=>{if(!aiProviderReady){setAppModal({type:"alert",icon:"\u2728",title:"AI Not Configured",warning:"Configure an AI provider in settings."});return;}setBatchModalOpen(true);}} style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>{"\u2728"} Generate with Skill</button>}
          <button onClick={clearCellSelection} style={{background:"transparent",color:"#e5e7eb",border:"1px solid #4b5563",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>Clear</button>
        </div>
      )}
      {/* Right-click context menu */}
      {ctxMenu&&(
        <div style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",padding:"6px 0",zIndex:3200,minWidth:220}} onClick={e=>e.stopPropagation()}>
          {ctxMenu.items.map((it,i)=>(
            <button key={i} onClick={()=>{it.action();setCtxMenu(null);}} style={{display:"block",width:"100%",textAlign:"left",background:"transparent",border:"none",padding:"8px 14px",cursor:"pointer",fontSize:13,color:T.text}} onMouseEnter={e=>e.currentTarget.style.background=T.surface2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{it.label}</button>
          ))}
        </div>
      )}
      {/* Batch AI modal */}
      {batchModalOpen&&<BatchAIModal selectedCells={selectedCells} pd={pd} course={course} weekStartISO={weekStartISO} termWeek={termWeek} settings={settings} FIELD_LABELS={BATCH_TEXT_FIELDS} onApply={(resultCells,accepted)=>{
        const applied=[];
        resultCells.forEach(rc=>{
          if(!accepted.has(cellKey(rc.day,rc.field)))return;
          updField(rc.day,rc.field,rc.text);
          const aiKey=FIELD_AI_KEY[rc.field]||rc.field;
          setPD(p=>({...p,[rc.day]:{...p[rc.day],aiGenerated:{...p[rc.day]?.aiGenerated,[aiKey]:true}}}));
          applied.push(rc);
        });
        setBatchModalOpen(false);
        clearCellSelection();
        setAppModal({type:"alert",icon:"\u2728",title:"Batch Applied",message:`Applied ${applied.length} cell${applied.length===1?"":"s"}. Press Undo (\u21a9) to revert.`});
      }} onClose={()=>setBatchModalOpen(false)}/>}
      {otherModal&&(()=>{
        const cfg={accommodation:{icon:"\u2699\ufe0f",title:"Add Other Accommodation",desc:"What other accommodation would you like to add?",placeholder:'e.g. "Preferential seating"'},formative:{icon:"\ud83d\udccb",title:"Add Other Assessment",desc:"What other formative assessment would you like to add?",placeholder:'e.g. "Kahoot review game"'},homework:{icon:"\ud83d\udcd2",title:"Add Other Homework",desc:"What other homework would you like to assign?",placeholder:'e.g. "Read pages 12\u201315 and summarize"'}}[otherModal.type];
        return(<OtherOptionModal icon={cfg.icon} title={cfg.title} description={cfg.desc} placeholder={cfg.placeholder} onAdd={(val)=>{
          const d=otherModal.day;
          if(otherModal.type==="accommodation")setPD(prev=>{const accs={...prev[d].accommodations};accs.accOthers=[...(accs.accOthers||[]),val];return{...prev,[d]:{...prev[d],accommodations:accs}};});
          else if(otherModal.type==="formative")setPD(prev=>{const a={...prev[d].assessment};a.formOthers=[...(a.formOthers||[]),val];return{...prev,[d]:{...prev[d],assessment:a}};});
          else if(otherModal.type==="homework")setPD(prev=>({...prev,[d]:{...prev[d],hmwOthers:[...(prev[d].hmwOthers||[]),val]}}));
          setOtherModal(null);
        }} onCancel={()=>setOtherModal(null)}/>);
      })()}
    </div>
  );
}

function OtherOptionModal({icon,title,description,placeholder,onAdd,onCancel}){
  const [value,setValue]=useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:6}}>{icon} {title}</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:14}}>{description}</div>
        <input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} autoFocus style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:14,boxSizing:"border-box",marginBottom:16}}/>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Cancel</button>
          <button onClick={()=>value.trim()&&onAdd(value.trim())} disabled={!value.trim()} style={{background:value.trim()?"#3b82f6":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:value.trim()?"pointer":"default",fontSize:14,fontWeight:"bold"}}>Add</button>
        </div>
      </div>
    </div>
  );
}


function ImportModal({savedPlans,setSavedPlans,persist,onClose,setAppModal}){
  const [error,setError]=useState(null);
  const [preview,setPreview]=useState(null);
  const [importData,setImportData]=useState(null);
  const [mode,setMode]=useState("replace");
  const [fileType,setFileType]=useState(null);
  const [sheetCourse,setSheetCourse]=useState("");
  const [sheetPreview,setSheetPreview]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [pasteText,setPasteText]=useState("");
  const [inputMode,setInputMode]=useState("file");
  const [detectedFormat,setDetectedFormat]=useState(null);
  const fileRef=useRef(null);

  const FIELD_LABEL_MAP={
    "bell work":"bellWorkType","bellwork":"bellWorkType","bell work type":"bellWorkType",
    "lesson topic":"lessonTitle","lesson title":"lessonTitle","topic":"lessonTitle",
    "key vocabulary":"keyVocab","key vocab":"keyVocab","vocabulary":"keyVocab",
    "learning objectives":"objectives","objectives":"objectives",
    "essential questions":"essentialQs","essential qs":"essentialQs",
    "anticipatory set":"anticipatoryText","anticipatory":"anticipatoryText",
    "guided practice":"guidedPracticeText","guided":"guidedPracticeText",
    "independent practice":"indPracticeText","independent":"indPracticeText",
    "conclusion":"conclusionText","closing":"conclusionText","confirm":"conclusionText","wrap up":"conclusionText",
    "accommodations":"_accommodations",
    "assessment":"_assessment","formative":"_formative","summative":"_summative",
    "homework":"_hmw","hmw":"_hmw","hw":"_hmw",
    "smps":"smps","smp":"smps","standards for mathematical practice":"smps",
    "msccrs":"msccrs","standards":"msccrs","ms ccrs":"msccrs",
    "content length adjustments":"sugContentLength","content length":"sugContentLength","sugcontentlength":"sugContentLength",
    "differentiation tiers":"sugDifferentiation","differentiation":"sugDifferentiation","sugdifferentiation":"sugDifferentiation",
    "pacing warnings":"sugPacing","pacing":"sugPacing","sugpacing":"sugPacing",
    "enhancement suggestions":"sugEnhancements","enhancements":"sugEnhancements","sugenhancements":"sugEnhancements",
  };

  const matchFieldLabel=(label)=>{
    const lower=(label||"").trim().toLowerCase();
    if(FIELD_LABEL_MAP[lower])return FIELD_LABEL_MAP[lower];
    for(const[k,v]of Object.entries(FIELD_LABEL_MAP)){if(lower.includes(k))return v;}
    return null;
  };

  const matchDay=(header)=>{
    const lower=(header||"").trim().toLowerCase();
    for(const d of DAYS){if(lower.includes(d.toLowerCase()))return d;}
    return null;
  };

  const parseSheetToPlans=(rows,course)=>{
    if(rows.length<2)return null;
    const headers=rows[0];
    const dayColumns={};
    const labelCol=0;
    for(let c=1;c<headers.length;c++){const day=matchDay(String(headers[c]||""));if(day)dayColumns[day]=c;}
    if(Object.keys(dayColumns).length===0){
      for(let c=1;c<Math.min(6,headers.length);c++){if(DAYS[c-1])dayColumns[DAYS[c-1]]=c;}
    }
    const pd=emptyWeek();
    for(let r=1;r<rows.length;r++){
      const row=rows[r];
      if(!row||!row[labelCol])continue;
      const fieldKey=matchFieldLabel(String(row[labelCol]));
      if(!fieldKey)continue;
      for(const[day,col]of Object.entries(dayColumns)){
        const val=String(row[col]||"").trim();
        if(!val)continue;
        if(fieldKey==="_accommodations"){
          const accs={};
          const lower=val.toLowerCase();
          for(const a of ACCOMMODATIONS){if(lower.includes(a.label.toLowerCase().slice(0,12)))accs[a.key]=true;}
          pd[day].accommodations={...pd[day].accommodations,...accs};
        }else if(fieldKey==="_assessment"||fieldKey==="_formative"){
          const forms=val.split(/[,;·]/).map(s=>s.trim()).filter(Boolean);
          const matched=forms.filter(f=>FORMATIVE_OPTIONS.some(o=>o.toLowerCase()===f.toLowerCase()));
          if(matched.length)pd[day].assessment={...pd[day].assessment,form:matched};
          else pd[day].assessment={...pd[day].assessment,quizName:val};
        }else if(fieldKey==="_summative"){
          pd[day].assessment={...pd[day].assessment,quizName:val};
        }else if(fieldKey==="_hmw"){
          const items=val.split(/[,;·]/).map(s=>s.trim()).filter(Boolean);
          const matched=items.filter(h=>HMW_OPTIONS.some(o=>o.toLowerCase()===h.toLowerCase()));
          pd[day].hmwSelected=matched.length?matched:["None"];
          if(!matched.length)pd[day].hmwText=val;
        }else if(fieldKey==="bellWorkType"){
          const matched=BELL_WORK_OPTIONS.find(o=>o.toLowerCase()===val.toLowerCase());
          if(matched){pd[day].bellWorkType=matched;}
          else{pd[day].bellWorkType="Other";pd[day].bellWorkText=val;}
        }else{
          pd[day][fieldKey]=val;
        }
      }
    }
    const weekISO=weekToISO(defaultWeekStart());
    return[{
      id:Date.now().toString()+Math.random().toString(36).slice(2,6),
      name:`Imported: ${course}`,
      course,weekStart:weekISO,term:getDefaultTerm(),termWeek:"",
      completed:false,planData:pd,
      createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      updatedAt:null
    }];
  };

  const normalizePlan=(p)=>{
    if(p.planData&&typeof p.planData==="object")return{id:p.id||Date.now().toString()+Math.random().toString(36).slice(2,6),name:p.name||p.title||"Imported Plan",course:p.course||p.subject||"",weekStart:p.weekStart||p.week_start||weekToISO(getWeekStart(new Date())),term:p.term||"",termWeek:p.termWeek||p.term_week||p.week||"",completed:!!p.completed,planData:p.planData,createdAt:p.createdAt||new Date().toLocaleString("en-US",{year:"numeric",month:"short",day:"numeric"}),updatedAt:p.updatedAt||null};
    if(p.Monday||p.Tuesday||p.Wednesday||p.Thursday||p.Friday){const pd={};DAYS.forEach(d=>{if(p[d])pd[d]=p[d];});return{id:Date.now().toString()+Math.random().toString(36).slice(2,6),name:p.name||p.title||"Imported Plan",course:p.course||p.subject||"",weekStart:p.weekStart||p.week_start||weekToISO(getWeekStart(new Date())),term:p.term||"",termWeek:p.termWeek||p.term_week||p.week||"",completed:false,planData:pd,createdAt:new Date().toLocaleString("en-US",{year:"numeric",month:"short",day:"numeric"}),updatedAt:null};}
    return p;
  };

  const parseMarkdownToPlans=(text)=>{
    const plans=[];
    const sections=text.split(/^# /m).filter(s=>s.trim());
    for(const section of sections){
      const lines=section.split("\n");
      const name=(lines[0]||"Imported Plan").trim();
      let course="",term="",termWeek="";
      const courseLine=lines.find(l=>/\*\*Course:\*\*/i.test(l));
      if(courseLine){
        const cm=courseLine.match(/\*\*Course:\*\*\s*([^|]+)/i);if(cm)course=cm[1].trim();
        const tm=courseLine.match(/\*\*Term:\*\*\s*([^|]+)/i);if(tm)term=tm[1].trim();
        const wm=courseLine.match(/\*\*Week:\*\*\s*(.+)/i);if(wm)termWeek=wm[1].trim();
      }
      const tableStart=lines.findIndex(l=>/^\|/.test(l.trim()));
      if(tableStart===-1)continue;
      const tableLines=lines.slice(tableStart).filter(l=>/^\|/.test(l.trim())&&!/^[\|\s-]+$/.test(l.trim()));
      if(tableLines.length<2)continue;
      const parseRow=(line)=>line.split("|").slice(1,-1).map(c=>c.trim().replace(/\\\|/g,"|"));
      const headers=parseRow(tableLines[0]);
      const dayIndices={};
      for(let i=1;i<headers.length;i++){
        const day=matchDay(headers[i]);
        if(day)dayIndices[day]=i;
      }
      const pd=emptyWeek();
      for(let r=1;r<tableLines.length;r++){
        const cells=parseRow(tableLines[r]);
        const fieldKey=matchFieldLabel(cells[0]||"");
        if(!fieldKey)continue;
        for(const[day,idx]of Object.entries(dayIndices)){
          const val=(cells[idx]||"").trim();
          if(!val)continue;
          if(fieldKey==="bellWorkType"){
            const parts=val.split(":").map(s=>s.trim());
            const matched=BELL_WORK_OPTIONS.find(o=>o.toLowerCase()===parts[0].toLowerCase());
            if(matched){pd[day].bellWorkType=matched;if(parts[1])pd[day].bellWorkText=parts.slice(1).join(":").trim();}
            else{pd[day].bellWorkType="Other";pd[day].bellWorkText=val;}
          }else if(fieldKey==="_accommodations"){
            const accs={};const lower=val.toLowerCase();
            for(const a of ACCOMMODATIONS){if(lower.includes(a.label.toLowerCase().slice(0,12)))accs[a.key]=true;}
            pd[day].accommodations={...pd[day].accommodations,...accs};
          }else if(fieldKey==="_assessment"||fieldKey==="_formative"){
            const forms=val.split(/[,;·|]/).map(s=>s.trim()).filter(Boolean);
            const matched=forms.filter(f=>FORMATIVE_OPTIONS.some(o=>o.toLowerCase()===f.toLowerCase()));
            if(matched.length)pd[day].assessment={...pd[day].assessment,form:matched};
            else pd[day].assessment={...pd[day].assessment,quizName:val};
          }else if(fieldKey==="anticipatoryText"){
            const parts=val.split(":").map(s=>s.trim());
            pd[day].anticipatoryText=val;
          }else if(fieldKey==="guidedPracticeText"){
            const parts=val.split(":").map(s=>s.trim());
            pd[day].guidedPracticeText=val;
          }else if(fieldKey==="indPracticeText"){
            const parts=val.split(":").map(s=>s.trim());
            pd[day].indPracticeText=val;
          }else if(fieldKey==="conclusionText"){
            pd[day].conclusionText=val;
          }else if(fieldKey==="_hmw"){
            const items=val.split(/[,;·]/).map(s=>s.trim()).filter(Boolean);
            const matched=items.filter(h=>HMW_OPTIONS.some(o=>o.toLowerCase()===h.toLowerCase()));
            pd[day].hmwSelected=matched.length?matched:["None"];
            if(!matched.length)pd[day].hmwText=val;
          }else{
            pd[day][fieldKey]=val;
          }
        }
      }
      plans.push({
        id:Date.now().toString()+Math.random().toString(36).slice(2,6),
        name,course,weekStart:weekToISO(getWeekStart(new Date())),term,termWeek,
        completed:false,planData:pd,
        createdAt:new Date().toLocaleString("en-US",{year:"numeric",month:"short",day:"numeric"}),updatedAt:null
      });
    }
    return plans.length?plans:null;
  };

  const processJSON=(text)=>{
    let data=JSON.parse(text);
    if(Array.isArray(data))data=data.map(normalizePlan);
    else data=normalizePlan(data);
    let plans=Array.isArray(data)?data:[data];
    const valid=plans.every(p=>p.planData&&typeof p.planData==="object");
    if(!valid)throw new Error("Could not recognize the JSON structure. Each plan needs a planData object with day keys (Monday-Friday) or be in the standard export format.");
    plans=plans.map(p=>{if(!p.weekStart)p.weekStart=weekToISO(getWeekStart(new Date()));return p;});
    const hasAllFields=plans.every(p=>p.id&&p.name&&p.course&&p.weekStart&&p.planData);
    setDetectedFormat(hasAllFields?"App Export (JSON)":"Claude / External (JSON)");
    return plans;
  };

  const processContent=(text,sourceExt)=>{
    setError(null);setPreview(null);setImportData(null);setSheetPreview(null);setDetectedFormat(null);
    const trimmed=text.trim();
    if(!trimmed){setError("No content to import.");return;}
    try{
      if(sourceExt==="csv"||sourceExt==="tsv"){
        setFileType("sheet");setDetectedFormat("Spreadsheet ("+sourceExt.toUpperCase()+")");
        const delim=sourceExt==="tsv"?"\t":",";
        const rows=trimmed.split(/\r?\n/).filter(l=>l.trim()).map(line=>{
          const cells=[];let cur="",inQ=false;
          for(let i=0;i<line.length;i++){
            const ch=line[i];
            if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else{inQ=!inQ;}}
            else if(ch===delim&&!inQ){cells.push(cur.trim());cur="";}
            else{cur+=ch;}
          }
          cells.push(cur.trim());return cells;
        });
        if(rows.length<2){setError("Spreadsheet must have at least a header row and one data row.");return;}
        setSheetPreview(rows);return;
      }
      // Try JSON first
      if(trimmed.startsWith("{")||trimmed.startsWith("[")){
        try{
          const plans=processJSON(trimmed);
          setFileType("json");setImportData(plans);setPreview(plans);return;
        }catch{}
      }
      // Try Markdown
      if(trimmed.includes("|")&&(trimmed.includes("# ")||trimmed.includes("**Course:"))){
        const plans=parseMarkdownToPlans(trimmed);
        if(plans&&plans.length){
          setFileType("markdown");setDetectedFormat("Markdown");setImportData(plans);setPreview(plans);return;
        }
      }
      // Fallback: try JSON parse anyway
      try{
        const plans=processJSON(trimmed);
        setFileType("json");setImportData(plans);setPreview(plans);return;
      }catch(jsonErr){
        // Fallback: try markdown anyway
        const plans=parseMarkdownToPlans(trimmed);
        if(plans&&plans.length){
          setFileType("markdown");setDetectedFormat("Markdown");setImportData(plans);setPreview(plans);return;
        }
        setError(`Could not parse content: ${jsonErr.message}`);
      }
    }catch(ex){setError(`Error processing content: ${ex.message}`);}
  };

  const handleFileInput=async(file)=>{
    if(!file)return;
    const ext=file.name.split(".").pop().toLowerCase();
    if(!["json","md","csv","tsv","xlsx","xls"].includes(ext)){setError(`Unsupported file type: .${ext}. Use .json, .md, .csv, .tsv, or .xlsx`);return;}
    try{
      if(ext==="xlsx"||ext==="xls"){
        setFileType("sheet");setDetectedFormat("Spreadsheet (Excel)");
        const buf=await file.arrayBuffer();
        const XLSX=await import("xlsx");
        const wb=XLSX.read(buf,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        if(rows.length<2){setError("Spreadsheet must have at least a header row and one data row.");return;}
        setError(null);setPreview(null);setImportData(null);setSheetPreview(rows);
      }else{
        const text=await file.text();
        processContent(text,ext);
      }
    }catch(ex){setError(`Error reading file: ${ex.message}`);}
  };

  const handleFileChange=(e)=>{
    const file=e.target.files?.[0];
    if(file)handleFileInput(file);
  };

  const handlePaste=()=>{
    if(!pasteText.trim())return;
    processContent(pasteText.trim());
  };

  const handleSheetConfirm=()=>{
    if(!sheetPreview||!sheetCourse){setError("Please select a course.");return;}
    const plans=parseSheetToPlans(sheetPreview,sheetCourse);
    if(!plans){setError("Could not parse spreadsheet data.");return;}
    setImportData(plans);setPreview(plans);setSheetPreview(null);
  };

  const countDaysWithContent=(plan)=>{
    let count=0;
    for(const d of DAYS){
      const p=plan.planData?.[d];
      if(p&&(p.lessonTitle||p.bellWorkType||p.objectives||p.keyVocab))count++;
    }
    return count;
  };

  const handleImport=()=>{
    if(!importData)return;
    let updated;
    const PROTECTED_FIELDS=new Set(["assessment"]);
    if(mode==="replace"){
      const importIds=new Set(importData.map(p=>p.id));
      const kept=savedPlans.filter(p=>!importIds.has(p.id));
      updated=[...importData.map(p=>{const existing=savedPlans.find(ep=>ep.id===p.id);const filledPD=fillPlanData(p.planData);if(existing){for(const day of DAYS){for(const pf of PROTECTED_FIELDS){if(existing.planData?.[day]?.[pf])filledPD[day][pf]=existing.planData[day][pf];}}}return{...p,planData:filledPD,updatedAt:new Date().toLocaleString("en-US",{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};}),...kept];
    }else if(mode==="merge"){
      updated=savedPlans.map(existing=>{
        const incoming=importData.find(p=>p.id===existing.id);
        if(!incoming)return existing;
        const mergedPD={};
        for(const day of DAYS){
          const ex=existing.planData?.[day]||emptyDay();
          const im=incoming.planData?.[day]||{};
          const merged={...ex};
          for(const[k,v]of Object.entries(im)){
            if(PROTECTED_FIELDS.has(k))continue;
            if(v&&(typeof v==="string"?v.trim():"")&&(!ex[k]||(typeof ex[k]==="string"&&!ex[k].trim())))merged[k]=v;
          }
          mergedPD[day]=merged;
        }
        return{...existing,planData:mergedPD,updatedAt:new Date().toLocaleString("en-US",{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};
      });
      const existingIds=new Set(savedPlans.map(p=>p.id));
      const brandNew=importData.filter(p=>!existingIds.has(p.id)).map(p=>({...p,planData:fillPlanData(p.planData)}));
      updated=[...updated,...brandNew];
    }else{
      const existingFingerprints=new Set(savedPlans.map(p=>`${p.course}::${p.weekStart}`));
      const newPlans=importData.filter(p=>!existingFingerprints.has(`${p.course}::${p.weekStart}`)).map(p=>({...p,id:Date.now().toString()+Math.random().toString(36).slice(2,6),planData:fillPlanData(p.planData)}));
      updated=[...newPlans,...savedPlans];
    }
    setSavedPlans(updated);
    persist(updated);
    if(setAppModal)setAppModal({type:"alert",icon:"\u2705",title:"Import Complete",message:`Successfully imported ${importData.length} plan${importData.length>1?"s":""}.`});
    onClose();
  };

  const resetState=()=>{setError(null);setPreview(null);setImportData(null);setSheetPreview(null);setDetectedFormat(null);setPasteText("");};

  const sel={width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,background:T.surface2,color:T.text,boxSizing:"border-box"};
  const tabBtn=(active)=>({background:active?"#7c3aed":"transparent",color:active?"#fff":T.textMuted,border:`1px solid ${active?"#7c3aed":T.border}`,borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"});

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:580,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\ud83d\udce5"} Import Lesson Plan</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Upload a file, or paste content directly. Format is auto-detected.</div>

        {!preview&&!sheetPreview&&(<>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>{setInputMode("file");resetState();}} style={tabBtn(inputMode==="file")}>{"\ud83d\udcc1"} Upload File</button>
            <button onClick={()=>{setInputMode("paste");resetState();}} style={tabBtn(inputMode==="paste")}>{"\ud83d\udccb"} Paste Content</button>
          </div>

          {inputMode==="file"&&(
            <div style={{marginBottom:16}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFileInput(e.dataTransfer.files[0]);}}>
              <div style={{border:`2px dashed ${dragOver?"#7c3aed":T.border}`,borderRadius:10,padding:"36px 20px",textAlign:"center",background:dragOver?"#faf5ff":T.surface2,transition:"all 0.15s"}}>
                <div style={{fontSize:32,marginBottom:8}}>{"\ud83d\udcc2"}</div>
                <div style={{fontSize:14,fontWeight:"bold",color:T.text,marginBottom:4}}>Drop file here or choose below</div>
                <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>.json, .md, .csv, .tsv, .xlsx</div>
                <input ref={fileRef} type="file" accept=".json,.md,.csv,.tsv,.xlsx,.xls" onChange={handleFileChange} onClick={e=>{e.target.value=null;}} style={{fontSize:14,cursor:"pointer"}}/>
              </div>
            </div>
          )}

          {inputMode==="paste"&&(
            <div style={{marginBottom:16}}>
              <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"Paste JSON or Markdown content here...\n\nSupported formats:\n\u2022 App-exported JSON\n\u2022 Claude-generated JSON\n\u2022 Markdown table (from Claude export)"} rows={10} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:13,fontFamily:"monospace",background:T.surface2,color:T.text,boxSizing:"border-box",resize:"vertical"}}/>
              <button onClick={handlePaste} disabled={!pasteText.trim()} style={{marginTop:8,background:pasteText.trim()?"#7c3aed":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:pasteText.trim()?"pointer":"default",fontSize:14,fontWeight:"bold",width:"100%"}}>Process Content</button>
            </div>
          )}
        </>)}

        {error&&(
          <div style={{background:T.errorBg,border:`1px solid ${T.error}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.error}}>
            {error}
          </div>
        )}

        {detectedFormat&&!error&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:12,background:"#dbeafe",color:"#1e40af",borderRadius:6,padding:"3px 10px",fontWeight:"bold"}}>Detected: {detectedFormat}</span>
          </div>
        )}

        {sheetPreview&&!preview&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:"bold",color:T.text,marginBottom:10}}>Spreadsheet Preview</div>
            <div style={{overflowX:"auto",border:`1px solid ${T.border}`,borderRadius:8,marginBottom:12,maxHeight:180}}>
              <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
                <thead>
                  <tr>{sheetPreview[0].map((h,i)=><th key={i} style={{background:T.surface2,padding:"6px 10px",borderBottom:`1px solid ${T.border}`,textAlign:"left",whiteSpace:"nowrap",fontWeight:"bold",color:T.text}}>{String(h)||`Col ${i+1}`}</th>)}</tr>
                </thead>
                <tbody>
                  {sheetPreview.slice(1,6).map((row,r)=>(
                    <tr key={r}>{sheetPreview[0].map((_,c)=><td key={c} style={{padding:"4px 10px",borderBottom:`1px solid ${T.border}`,color:T.textMuted,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(row[c]||"")}</td>)}</tr>
                  ))}
                  {sheetPreview.length>6&&<tr><td colSpan={sheetPreview[0].length} style={{padding:"4px 10px",color:T.textMuted,fontStyle:"italic"}}>...and {sheetPreview.length-6} more rows</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,color:T.textMuted,display:"block",marginBottom:4}}>Which course is this plan for? *</label>
              <select value={sheetCourse} onChange={e=>setSheetCourse(e.target.value)} style={sel}>
                <option value="">-- Select Course --</option>
                {COURSES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleSheetConfirm} disabled={!sheetCourse} style={{background:sheetCourse?"#7c3aed":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:sheetCourse?"pointer":"default",fontSize:14,fontWeight:"bold",width:"100%"}}>Parse Spreadsheet</button>
          </div>
        )}

        {preview&&(
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:"bold",color:T.text}}>Plans found: {preview.length}</div>
              <button onClick={resetState} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,color:T.textMuted}}>Start Over</button>
            </div>
            <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8,background:T.surface2}}>
              {preview.map((p,i)=>{
                const cc=COURSE_COLORS[p.course]||{bg:T.accentBlue};
                const existing=savedPlans.find(s=>s.id===p.id);
                const daysCount=countDaysWithContent(p);
                return(
                  <div key={i} style={{padding:"10px 14px",borderBottom:i<preview.length-1?`1px solid ${T.border}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:"bold",color:T.text}}>{p.name}</div>
                      <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>
                        {p.course&&<span style={{background:cc.bg,color:"#fff",borderRadius:4,padding:"1px 6px",fontSize:11,marginRight:6}}>{p.course}</span>}
                        {p.term?`${p.term} `:""}{p.termWeek||""}{p.weekStart?` \u00b7 Week of ${p.weekStart}`:""}
                        <span style={{marginLeft:6,fontSize:11,color:T.textMuted}}>({daysCount}/5 days)</span>
                      </div>
                    </div>
                    {existing&&<span style={{fontSize:11,background:"#fef3c7",color:"#92400e",borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>Exists</span>}
                  </div>
                );
              })}
            </div>

            {preview.some(p=>savedPlans.find(s=>s.id===p.id))&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:13,fontWeight:"bold",color:T.text,marginBottom:6}}>Duplicate handling:</div>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",marginBottom:4}}>
                  <input type="radio" name="importMode" checked={mode==="replace"} onChange={()=>setMode("replace")}/>
                  Replace existing plans with imported versions
                </label>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",marginBottom:4}}>
                  <input type="radio" name="importMode" checked={mode==="merge"} onChange={()=>setMode("merge")}/>
                  Merge (fill only empty fields from import)
                </label>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                  <input type="radio" name="importMode" checked={mode==="skip"} onChange={()=>setMode("skip")}/>
                  Skip duplicates (keep existing)
                </label>
              </div>
            )}
          </div>
        )}

        <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:24}}>
          <button onClick={onClose} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14}}>Cancel</button>
          <button onClick={handleImport} disabled={!importData} style={{background:importData?"#7c3aed":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:importData?"pointer":"default",fontSize:14,fontWeight:"bold"}}>Import {importData?`(${importData.length})`:""}</button>
        </div>
      </div>
    </div>
  );
}

function planToMarkdown(plan){
  const pd=plan.planData;const lines=[];
  lines.push(`# ${plan.name}`);
  lines.push(`**Course:** ${plan.course} | **Term:** ${plan.term||""} | **Week:** ${plan.termWeek||""}`);
  const ws=parseLocalDate(plan.weekStart);const wDates=getWeekDates(ws);
  lines.push(`**Dates:** ${formatDate(wDates[0])} \u2013 ${formatDate(wDates[4])}`);
  lines.push("");
  const hdr=["Field",...DAYS.map((d,i)=>`${d} (${formatDate(wDates[i])})`)];
  lines.push("| "+hdr.join(" | ")+" |");
  lines.push("| "+hdr.map(()=>"---").join(" | ")+" |");
  FIELDS.forEach(({key,label})=>{
    const vals=DAYS.map(d=>{const p=pd[d]||{};
      if(key==="bellWork")return[p.bellWorkType,p.bellWorkText].filter(Boolean).join(": ");
      if(key==="lessonTitle")return p.lessonTitle||"";
      if(key==="anticipatorySet")return[(p.anticipatorySelected||[]).join(", "),p.anticipatoryText].filter(Boolean).join(": ");
      if(key==="guidedPractice")return[p.guidedPracticeType,p.guidedPracticeText].filter(Boolean).join(": ");
      if(key==="independentPractice")return[p.indPracticeType,p.indPracticeText].filter(Boolean).join(": ");
      if(key==="lesson")return[p.lessonType,p.lesson].filter(Boolean).join(": ");
      if(key==="conclusion")return[p.conclusionType,p.conclusionText].filter(Boolean).join(": ");
      if(key==="hmw")return[(p.hmwSelected||["None"]).join(", "),p.hmwText].filter(Boolean).join(": ");
      if(key==="accommodations")return ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label).join(", ");
      if(key==="assessment"){const f=(p.assessment?.form||[]).join(", ");const n=p.assessment?.quizName||"";return[f,n].filter(Boolean).join(" | ");}
      return(p[key]||"");
    }).map(v=>v.replace(/\|/g,"\\|").replace(/\n/g," "));
    lines.push("| "+[label,...vals].join(" | ")+" |");
  });
  // One value for the whole week; first column only, rest blank.
  {const wo=(pd.Monday?.weeklyObjectives||"").replace(/\|/g,"\\|").replace(/\n/g," ");
   if(wo)lines.push("| "+["Weekly Objectives",wo,"","","",""].join(" | ")+" |");}
  if(DAYS.some(d=>pd[d]?.canceled)){
    lines.push("");lines.push("**Canceled Days:**");
    DAYS.forEach(d=>{const c=pd[d]?.canceled;if(c)lines.push(`- ${d}: ${c.reason||"Canceled"}${c.isHoliday?" (Holiday)":""}`);});
  }
  return lines.join("\n");
}

function planToClaudeJSON(plan){
  return{id:plan.id,name:plan.name,course:plan.course,weekStart:plan.weekStart,term:plan.term||"",termWeek:plan.termWeek||"",completed:!!plan.completed,planData:plan.planData,createdAt:plan.createdAt,updatedAt:plan.updatedAt};
}

function ExportModal({plans,onClose,setAppModal}){
  const [format,setFormat]=useState("json");
  const [copied,setCopied]=useState(false);
  const [exporting,setExporting]=useState(false);

  const download=(blob,filename)=>{
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  const getTextContent=()=>{
    if(format==="json")return JSON.stringify(plans.map(planToClaudeJSON),null,2);
    if(format==="markdown")return plans.map(planToMarkdown).join("\n\n---\n\n");
    if(format==="csv"){
      const csvParts=[];
      plans.forEach((plan,idx)=>{
        const pd=plan.planData;
        if(idx>0)csvParts.push("");
        csvParts.push([plan.name,plan.course,plan.term||"",plan.termWeek||""].map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(","));
        csvParts.push(["",..."Monday,Tuesday,Wednesday,Thursday,Friday".split(",")].map(c=>`"${c}"`).join(","));
        FIELDS.forEach(({key,label})=>{
          const vals=DAYS.map(d=>{const p=pd[d]||{};
            if(key==="bellWork")return[p.bellWorkType,p.bellWorkText].filter(Boolean).join(": ");
            if(key==="lessonTitle")return p.lessonTitle||"";
            if(key==="anticipatorySet")return[(p.anticipatorySelected||[]).join(", "),p.anticipatoryText].filter(Boolean).join(": ");
            if(key==="guidedPractice")return[p.guidedPracticeType,p.guidedPracticeText].filter(Boolean).join(": ");
            if(key==="independentPractice")return[p.indPracticeType,p.indPracticeText].filter(Boolean).join(": ");
            if(key==="lesson")return[p.lessonType,p.lesson].filter(Boolean).join(": ");
            if(key==="conclusion")return[p.conclusionType,p.conclusionText].filter(Boolean).join(": ");
            if(key==="hmw")return[(p.hmwSelected||["None"]).join(", "),p.hmwText].filter(Boolean).join(": ");
            if(key==="accommodations")return ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label).join(", ");
            if(key==="assessment"){const f=(p.assessment?.form||[]).join(", ");const s=p.assessment?.quizName||"";return[f,s].filter(Boolean).join(" | ");}
            return(p[key]||"").replace(/\n/g," ");
          });
          csvParts.push([label,...vals].map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(","));
        });
        // One value for the whole week; first column only, rest blank.
        {const wo=(pd.Monday?.weeklyObjectives||"").replace(/\n/g," ");
         if(wo)csvParts.push(["Weekly Objectives",wo,"","","",""].map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(","));}
      });
      return csvParts.join("\n");
    }
    return"";
  };

  const content=getTextContent();
  const extMap={json:"json",markdown:"md",csv:"csv",xlsx:"xlsx"};
  const ext=extMap[format]||"json";
  const isTextFormat=format!=="xlsx";

  const handleCopy=()=>{
    const text=isTextFormat?content:getTextContent();
    try{
      if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}).catch(()=>{fallbackCopy(text);});}
      else{fallbackCopy(text);}
    }catch{fallbackCopy(text);}
    function fallbackCopy(t){const ta=document.createElement("textarea");ta.value=t;ta.style.cssText="position:fixed;left:-9999px;top:-9999px;";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  const handleDownload=async()=>{
    setExporting(true);
    try{
      if(format==="xlsx"){
        const XLSX=await import("xlsx");
        const wb=XLSX.utils.book_new();
        plans.forEach((plan,idx)=>{
          const pd=plan.planData;const rows=[];
          rows.push(["",..."Monday,Tuesday,Wednesday,Thursday,Friday".split(",")]);
          FIELDS.forEach(({key,label})=>{
            const vals=DAYS.map(d=>{const p=pd[d]||{};
              if(key==="bellWork")return p.bellWorkType||"";
              if(key==="lessonTitle")return p.lessonTitle||"";
              if(key==="anticipatorySet")return(p.anticipatorySelected||[]).join(", ");
              if(key==="guidedPractice")return p.guidedPracticeType||"";
              if(key==="independentPractice")return p.indPracticeType||"";
              if(key==="lesson")return p.lessonType||(p.lesson||"").replace(/\n/g," ");
              if(key==="conclusion")return p.conclusionType||(p.conclusionText||"").replace(/\n/g," ");
              if(key==="hmw")return(p.hmwSelected||["None"]).join(", ");
              if(key==="accommodations")return ACCOMMODATIONS.filter(a=>p.accommodations?.[a.key]).map(a=>a.label).join(", ");
              if(key==="assessment"){const f=(p.assessment?.form||[]).join(", ");const s=p.assessment?.quizName||"";return[f,s].filter(Boolean).join(" | ");}
              return(p[key]||"").replace(/\n/g," ");
            });
            rows.push([label,...vals]);
          });
          // One value for the whole week; first column only, rest blank.
          {const wo=(pd.Monday?.weeklyObjectives||"").replace(/\n/g," ");
           if(wo)rows.push(["Weekly Objectives",wo,"","","",""]);}
          const textRows=[
            {label:"Bell Work Text",key:"bellWorkText"},
            {label:"Anticipatory Set Text",key:"anticipatoryText"},
            {label:"Lesson Text",key:"lesson"},
            {label:"Guided Practice Text",key:"guidedPracticeText"},
            {label:"Independent Practice Text",key:"indPracticeText"},
            {label:"Exit Ticket & Conclusion Text",key:"conclusionText"},
          ];
          textRows.forEach(({label:lbl,key:k})=>{
            const vals=DAYS.map(d=>(pd[d]?.[k]||"").replace(/\n/g," "));
            rows.push([lbl,...vals]);
          });
          const ws=XLSX.utils.aoa_to_sheet(rows);
          ws["!cols"]=[{wch:22},{wch:30},{wch:30},{wch:30},{wch:30},{wch:30}];
          const sheetName=(plan.name||`Plan ${idx+1}`).replace(/[\\/*?[\]:]/g,"").slice(0,31);
          XLSX.utils.book_append_sheet(wb,ws,sheetName);
        });
        const fname=plans.length===1?`${plans[0].name||"plan"}.xlsx`:"lesson-plans.xlsx";
        XLSX.writeFile(wb,fname);
      }else{
        const typeMap={json:"application/json",markdown:"text/markdown",csv:"text/csv"};
        const blob=new Blob([content],{type:typeMap[format]||"text/plain"});
        const fname=plans.length===1?`${plans[0].name||"plan"}.${ext}`:`lesson-plans.${ext}`;
        download(blob,fname);
      }
    }catch(err){if(setAppModal)setAppModal({type:"alert",icon:"\u274c",title:"Export Failed",warning:`Export failed: ${err.message}`});}
    finally{setExporting(false);}
  };

  const fmtBtn=(f,label)=>({background:format===f?"#0369a1":"transparent",color:format===f?"#fff":T.textMuted,border:`1px solid ${format===f?"#0369a1":T.border}`,borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"});

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:32,width:640,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:4}}>{"\ud83d\udce4"} Export ({plans.length} plan{plans.length>1?"s":""})</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:16}}>Choose a format, preview the content, then download or copy.</div>

        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>{setFormat("json");setCopied(false);}} style={fmtBtn("json")}>JSON</button>
          <button onClick={()=>{setFormat("markdown");setCopied(false);}} style={fmtBtn("markdown")}>Markdown</button>
          <button onClick={()=>{setFormat("csv");setCopied(false);}} style={fmtBtn("csv")}>CSV</button>
          <button onClick={()=>{setFormat("xlsx");setCopied(false);}} style={fmtBtn("xlsx")}>Excel (.xlsx)</button>
        </div>

        {isTextFormat?(
          <textarea readOnly value={content} style={{flex:1,minHeight:200,maxHeight:360,width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:12,fontFamily:"monospace",background:T.surface2,color:T.text,boxSizing:"border-box",resize:"vertical"}}/>
        ):(
          <div style={{flex:1,minHeight:120,border:`1px solid ${T.border}`,borderRadius:8,padding:20,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
            <div style={{fontSize:32}}>{"\ud83d\udcca"}</div>
            <div style={{fontSize:14,fontWeight:"bold",color:T.text}}>Excel format selected</div>
            <div style={{fontSize:12,color:T.textMuted}}>Preview not available for .xlsx files. Click Download to export.</div>
          </div>
        )}

        <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:16,flexWrap:"wrap"}}>
          <button onClick={onClose} style={{background:"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:14}}>Close</button>
          <button onClick={handleCopy} disabled={!isTextFormat} style={{background:copied?"#16a34a":isTextFormat?"#7c3aed":"#9ca3af",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:isTextFormat?"pointer":"default",fontSize:14,fontWeight:"bold"}}>{copied?"\u2713 Copied!":"\ud83d\udccb Copy"}</button>
          <button onClick={handleDownload} disabled={exporting} style={{background:exporting?"#9ca3af":"#0369a1",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:exporting?"default":"pointer",fontSize:14,fontWeight:"bold"}}>{exporting?"Exporting...":`\ud83d\udcbe Download .${ext}`}</button>
        </div>
      </div>
    </div>
  );
}

function GapDetectorView({savedPlans,schoolHolidays,setPrevTab,setActiveTab,setEditingId,activeTab}){
  const [expanded,setExpanded]=useState({});
  const gaps=detectGaps(savedPlans,schoolHolidays);
  const totalGaps=gaps.thisWeek.reduce((s,e)=>s+e.gapCount,0)+gaps.nextWeek.reduce((s,e)=>s+e.gapCount,0);
  const toggleExpand=(id)=>setExpanded(prev=>({...prev,[id]:!prev[id]}));
  let globalIdx=0;
  const renderSection=(title,entries)=>{
    if(entries.length===0)return <div style={{padding:"12px 0",color:T.textMuted,fontSize:14}}>No gaps found for {title.toLowerCase()}.</div>;
    return entries.map((entry)=>{
      const idx=globalIdx++;
      const cc=COURSE_COLORS[entry.plan.course]||{bg:"#6b7280"};
      const byDay={};entry.gaps.forEach(g=>{if(!byDay[g.day])byDay[g.day]=[];byDay[g.day].push(g);});
      const isOpen=expanded[entry.plan.id]!==undefined?expanded[entry.plan.id]:idx===0;
      return(
        <div key={entry.plan.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:10,overflow:"hidden"}}>
          <div onClick={()=>toggleExpand(entry.plan.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",cursor:"pointer",userSelect:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:T.textMuted,marginRight:2}}>{isOpen?"\u25bc":"\u25b6"}</span>
              <span style={{fontWeight:"bold",fontSize:15,color:T.text}}>{entry.plan.name}</span>
              <span style={{background:cc.bg,color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>{entry.plan.course}</span>
              <span style={{background:"#dc2626",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>{entry.gapCount} gap{entry.gapCount!==1?"s":""}</span>
            </div>
            <button onClick={e=>{e.stopPropagation();setPrevTab(activeTab);setActiveTab("plans");setEditingId(entry.plan.id);lastOpenedPlanId.current=entry.plan.id;}} style={{background:T.accentBlue||"#2563eb",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:"bold"}}>Go to Plan</button>
          </div>
          {isOpen&&<div style={{padding:"0 18px 14px"}}>
            {DAYS.map(day=>{const dg=byDay[day];if(!dg)return null;return(
              <div key={day} style={{marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:"bold",color:T.textMuted,marginBottom:3}}>{day}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {dg.map((g,j)=>{
                    const sev=g.weight>=8?"#dc2626":g.weight>=5?"#d97706":"#6b7280";
                    return <span key={j} style={{background:sev+"18",color:sev,border:`1px solid ${sev}40`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:"bold"}}>{g.label}</span>;
                  })}
                </div>
              </div>
            );})}
          </div>}
        </div>
      );
    });
  };
  return(
    <div style={{padding:"16px 24px 24px",overflowY:"auto",flex:1}}>
      <div style={{fontSize:19,fontWeight:"bold",color:T.text,marginBottom:16}}>{"\ud83d\udd0d"} Gap Detector</div>
      {savedPlans.length===0?<div style={{padding:40,textAlign:"center",color:T.textMuted}}>Create plans to detect gaps.</div>:(
        <div>
          <div style={{background:totalGaps>0?"#fef3c7":"#dcfce7",border:`1px solid ${totalGaps>0?"#f59e0b":"#16a34a"}`,borderRadius:10,padding:"12px 18px",marginBottom:16,fontSize:15,fontWeight:"bold",color:totalGaps>0?"#92400e":"#15803d"}}>
            {totalGaps>0?`${totalGaps} empty cell${totalGaps!==1?"s":""} found in edited plans`:"No gaps detected! All edited plans look complete."}
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:17,fontWeight:"bold",color:T.text,marginBottom:10,borderBottom:`2px solid ${T.border}`,paddingBottom:6}}>This Week's Gaps</div>
            {renderSection("this week",gaps.thisWeek)}
          </div>
          <div>
            <div style={{fontSize:17,fontWeight:"bold",color:T.text,marginBottom:10,borderBottom:`2px solid ${T.border}`,paddingBottom:6}}>Next Week's Gaps</div>
            {renderSection("next week",gaps.nextWeek)}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({settings,setSettings,onBack,saveSettings,settingsDirty,setAppModal,savedPlans,setSavedPlans,schoolHolidays,setSchoolHolidays,holidayLabels,setHolidayLabels,persist,persistHolidays,persistHolidayLabels,lastBackupTime,setLastBackupTime,doBackup,backupSessionId,pacingData,setPacingData,pacingUndoStack,setPacingUndoStack,pacingRedoStack,setPacingRedoStack}){
  const [expanded,setExpanded]=useState({appearance:true,ai:false,profile:false,defaults:false,data:false,notifications:false});
  const [showKey,setShowKey]=useState(false);
  const [draftProfile,setDraftProfile]=useState({teacherName:settings.teacherName,schoolName:settings.schoolName,location:settings.location});
  const [draftKey,setDraftKey]=useState(settings.apiKey);
  const toggle=(k)=>setExpanded(prev=>({...prev,[k]:!prev[k]}));
  const update=(key,val)=>setSettings(s=>({...s,[key]:val}));
  const resetSection=(keys)=>{setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Reset Section?",message:"Reset this section to default values?",confirmLabel:"Reset",confirmColor:"#dc2626",onConfirm:()=>{const patch={};keys.forEach(k=>{patch[k]=DEFAULT_SETTINGS[k];});setSettings(s=>({...s,...patch}));if(keys.includes("teacherName"))setDraftProfile({teacherName:DEFAULT_SETTINGS.teacherName,schoolName:DEFAULT_SETTINGS.schoolName,location:DEFAULT_SETTINGS.location});if(keys.includes("apiKey"))setDraftKey("");}});};
  const sectionHeader=(label,key,resetKeys)=>(
    <div onClick={()=>toggle(key)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"14px 18px",background:T.surface2,borderRadius:expanded[key]?"10px 10px 0 0":10,border:`1px solid ${T.border}`,borderBottom:expanded[key]?"none":`1px solid ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:12,color:T.textMuted}}>{expanded[key]?"\u25bc":"\u25b6"}</span>
        <span style={{fontSize:15,fontWeight:"bold",color:T.text}}>{label}</span>
      </div>
      <button onClick={e=>{e.stopPropagation();resetSection(resetKeys);}} style={{background:"transparent",border:"none",color:T.textMuted,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Reset</button>
    </div>
  );
  const sectionBody=(key,children)=>expanded[key]&&(
    <div style={{padding:"16px 18px",border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",background:T.surface}}>
      {children}
    </div>
  );
  const labelStyle={fontSize:13,fontWeight:"bold",color:T.text,marginBottom:6,display:"block"};
  const inputStyle={width:"100%",boxSizing:"border-box",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:14,color:T.text,background:T.surface};
  const btnStyle=(bg)=>({background:bg||T.accentBlue,color:"#fff",border:"none",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:"bold"});
  const restoreData=(data)=>{
    if(data.plans){setSavedPlans(data.plans);persist(data.plans);}
    if(data.settings)setSettings(sv=>({...DEFAULT_SETTINGS,...data.settings}));
    if(data.schoolHolidays){setSchoolHolidays(data.schoolHolidays);persistHolidays(data.schoolHolidays);}
    if(data.holidayLabels){setHolidayLabels(data.holidayLabels);persistHolidayLabels(data.holidayLabels);}
    if(data.pacingGuideData){setPacingData(data.pacingGuideData);try{localStorage.setItem("pacingGuideData",JSON.stringify(data.pacingGuideData));}catch(e){}}
    if(Array.isArray(data.pacingUndoStack)){setPacingUndoStack(data.pacingUndoStack);try{localStorage.setItem("pacingUndoStack",JSON.stringify(data.pacingUndoStack.slice(-50)));}catch(e){}}
    if(Array.isArray(data.pacingRedoStack)){setPacingRedoStack(data.pacingRedoStack);try{localStorage.setItem("pacingRedoStack",JSON.stringify(data.pacingRedoStack.slice(-50)));}catch(e){}}
    const tplCount=Array.isArray(data.templates)?data.templates.length:0;
    const msg=tplCount>0?`Data restored from backup.\n\nNote: Templates are no longer supported; the ${tplCount} template${tplCount===1?"":"s"} in this backup ${tplCount===1?"was":"were"} skipped.`:"Data restored from backup.";
    setAppModal({type:"alert",icon:"\u2705",title:"Restored",message:msg});
  };
  const browseServerBackups=async()=>{
    try{
      const res=await fetch("http://localhost:5175/api/backups");
      if(!res.ok)throw new Error("fail");
      const d=await res.json();
      if(d.sessions.length===0){setAppModal({type:"alert",icon:"\ud83d\udce6",title:"No Backups",message:"No server backups found."});return;}
      const opts=[];
      d.sessions.forEach(s=>{s.backups.forEach(b=>{
        const time=new Date(b.modified).toLocaleString();
        opts.push({label:s.session+" / "+b.file+" ("+time+")",bg:T.surface,color:T.text,border:T.border,action:async()=>{
          const r2=await fetch("http://localhost:5175/api/backup/"+s.session+"/"+b.file);
          const bdata=await r2.json();
          setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Restore?",message:"Restore from "+s.session+"/"+b.file+"?",confirmLabel:"Restore",confirmColor:"#dc2626",onConfirm:()=>restoreData(bdata)});
        }});
      });});
      setAppModal({type:"select",icon:"\ud83d\udce6",title:"Restore from Server",message:"Select a backup:",options:opts});
    }catch(e){setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Server Unavailable",message:"Backup server not running. Start with: npm run backup-server"});}
  };

  return(
    <div style={{padding:"24px 32px",maxWidth:640,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <button onClick={onBack} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:14,fontWeight:"bold",color:T.text}}>{"\u2190"} Back</button>
        <div style={{fontSize:22,fontWeight:"bold",color:T.text,flex:1}}>{"\u2699\ufe0f"} Settings</div>
        <button onClick={()=>{saveSettings();setAppModal({type:"alert",icon:"\u2705",title:"Settings Saved",message:"Your settings have been saved."});}} style={{background:settingsDirty?"#16a34a":"#6b7280",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:15,fontWeight:"bold",opacity:settingsDirty?1:0.6,transition:"all 0.2s",boxShadow:settingsDirty?"0 2px 8px rgba(22,163,74,0.3)":"none"}}>{settingsDirty?"\ud83d\udcbe Save Settings":"\u2705 Saved"}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>

        {/* Appearance */}
        {sectionHeader("\ud83c\udfa8 Appearance","appearance",["darkMode","zoom","courseColors","heatmapThresholds"])}
        {sectionBody("appearance",<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <span style={labelStyle}>Dark Mode</span>
            <label style={{position:"relative",display:"inline-block",width:48,height:26,cursor:"pointer"}}>
              <input type="checkbox" checked={settings.darkMode} onChange={e=>update("darkMode",e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:"absolute",inset:0,background:settings.darkMode?T.accent:"#ccc",borderRadius:26,transition:"0.2s"}}/>
              <span style={{position:"absolute",top:3,left:settings.darkMode?25:3,width:20,height:20,background:"#fff",borderRadius:"50%",transition:"0.2s"}}/>
            </label>
          </div>
          <div style={{marginBottom:16}}>
            <span style={labelStyle}>Zoom: {settings.zoom}%</span>
            <input type="range" min={50} max={150} step={5} value={settings.zoom} onChange={e=>update("zoom",Number(e.target.value))} style={{width:"100%"}}/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={()=>update("zoom",100)} style={btnStyle("#6b7280")}>Default (100%)</button>
              <button onClick={()=>update("zoom",Math.round(window.innerWidth/1200*100))} style={btnStyle("#6b7280")}>Fit Width</button>
              <button onClick={()=>{const wz=window.innerWidth/1200;const hz=window.innerHeight/900;update("zoom",Math.round(Math.min(wz,hz)*100));}} style={btnStyle("#6b7280")}>Fit Browser</button>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <span style={labelStyle}>Course Colors</span>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.keys(DEFAULT_SETTINGS.courseColors).map(c=>(
                <div key={c} style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="color" value={settings.courseColors?.[c]?.bg||DEFAULT_SETTINGS.courseColors[c].bg} onChange={e=>{const hex=e.target.value;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);const light=`rgba(${r},${g},${b},0.08)`;const border=`rgba(${r},${g},${b},0.4)`;const text=`rgb(${Math.round(r*0.4)},${Math.round(g*0.4)},${Math.round(b*0.4)})`;update("courseColors",{...settings.courseColors,[c]:{bg:hex,light,border,text}});}} style={{width:32,height:32,padding:0,border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer"}}/>
                  <span style={{fontSize:13,color:T.text}}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span style={labelStyle}>Heatmap Thresholds</span>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {(settings.heatmapThresholds||DEFAULT_SETTINGS.heatmapThresholds).map((t2,i)=>i===0?null:(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="color" value={t2.color} onChange={e=>{const ts=[...settings.heatmapThresholds];ts[i]={...ts[i],color:e.target.value};update("heatmapThresholds",ts);}} style={{width:28,height:28,padding:0,border:`1px solid ${T.border}`,borderRadius:4,cursor:"pointer"}}/>
                  <span style={{fontSize:12,color:T.textMuted,minWidth:50}}>{Math.round((settings.heatmapThresholds[i-1]?.max||0)*100)}%-{Math.round(t2.max*100)}%</span>
                  <input type="range" min={Math.round((settings.heatmapThresholds[i-1]?.max||0)*100)} max={i<settings.heatmapThresholds.length-1?100:101} value={Math.round(t2.max*100)} onChange={e=>{const ts=[...settings.heatmapThresholds];ts[i]={...ts[i],max:Number(e.target.value)/100};update("heatmapThresholds",ts);}} style={{flex:1}}/>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* AI Configuration */}
        {sectionHeader("\ud83e\udd16 AI Configuration","ai",["apiKey","aiProvider","aiModel"])}
        {sectionBody("ai",<>
          <div style={{marginBottom:16}}>
            <span style={labelStyle}>AI Provider</span>
            <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
              {[{val:"cli",label:"\u2728 Claude CLI (Subscription)"},{val:"gemini",label:"\ud83c\udf1f Google Gemini (Free)"},{val:"anthropic",label:"\ud83e\udde0 Anthropic Claude (Paid)"}].map(p=>(
                <label key={p.val} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                  <input type="radio" name="aiProvider" checked={settings.aiProvider===p.val} onChange={()=>{update("aiProvider",p.val);if(p.val==="gemini")update("aiModel","gemini-flash");else if(p.val==="anthropic")update("aiModel","sonnet");}}/>{p.label}
                </label>
              ))}
            </div>
          </div>
          {settings.aiProvider==="cli"?(
            <div style={{marginBottom:16,padding:"12px 14px",background:"#ecfeff",border:"1px solid #a5f3fc",borderRadius:8,fontSize:12,color:"#155e75"}}>
              {"\u2728"} Uses your Claude Code subscription via the local backup server (localhost:5175) and the <b>lesson-plan-completer</b> skill. No API key needed. Each cell takes ~15\u201330s; multi-cell batches are one call regardless of cell count.
            </div>
          ):(
            <div style={{marginBottom:16}}>
              <span style={labelStyle}>API Key {settings.aiProvider==="gemini"?<span style={{fontWeight:"normal",fontSize:12,color:T.textMuted}}> — get free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:T.accentBlue}}>aistudio.google.com</a></span>:<span style={{fontWeight:"normal",fontSize:12,color:T.textMuted}}> — requires credits at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:T.accentBlue}}>console.anthropic.com</a></span>}</span>
              <div style={{display:"flex",gap:8}}>
                <input type={showKey?"text":"password"} value={draftKey} onChange={e=>setDraftKey(e.target.value)} placeholder={settings.aiProvider==="gemini"?"Enter Google Gemini API key...":"Enter Anthropic API key..."} style={{...inputStyle,flex:1}}/>
                <button onClick={()=>setShowKey(!showKey)} style={btnStyle("#6b7280")}>{showKey?"\ud83d\ude48":"\ud83d\udc41\ufe0f"}</button>
              </div>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={()=>{update("apiKey",draftKey);}} style={btnStyle()}>Save Key</button>
                <button onClick={()=>{setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Clear API Key?",message:"This will remove your saved API key.",confirmLabel:"Clear",confirmColor:"#dc2626",onConfirm:()=>{setDraftKey("");update("apiKey","");}});}} style={btnStyle("#dc2626")}>Clear</button>
              </div>
            </div>
          )}
          {settings.aiProvider!=="cli"&&(
          <div>
            <span style={labelStyle}>AI Model</span>
            <div style={{display:"flex",gap:16}}>
              {(settings.aiProvider==="gemini"?[{val:"gemini-flash",label:"Gemini 2.0 Flash (Fast)"},{val:"gemini-pro",label:"Gemini 2.0 Flash Thinking (Quality)"}]:[{val:"sonnet",label:"Claude Sonnet (Fast)"},{val:"opus",label:"Claude Opus (Quality)"}]).map(m=>(
                <label key={m.val} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                  <input type="radio" name="aiModel" checked={settings.aiModel===m.val} onChange={()=>update("aiModel",m.val)}/>{m.label}
                </label>
              ))}
            </div>
          </div>
          )}
        </>)}

        {/* Teacher Profile */}
        {sectionHeader("\ud83d\udc64 Teacher Profile","profile",["teacherName","schoolName","location"])}
        {sectionBody("profile",<>
          <div style={{marginBottom:12}}>
            <span style={labelStyle}>Teacher Name</span>
            <input value={draftProfile.teacherName} onChange={e=>setDraftProfile(p=>({...p,teacherName:e.target.value}))} style={inputStyle}/>
          </div>
          <div style={{marginBottom:12}}>
            <span style={labelStyle}>School Name</span>
            <input value={draftProfile.schoolName} onChange={e=>setDraftProfile(p=>({...p,schoolName:e.target.value}))} style={inputStyle}/>
          </div>
          <div style={{marginBottom:12}}>
            <span style={labelStyle}>Location</span>
            <input value={draftProfile.location} onChange={e=>setDraftProfile(p=>({...p,location:e.target.value}))} style={inputStyle}/>
          </div>
          <button onClick={()=>{setSettings(s=>({...s,...draftProfile}));}} style={btnStyle()}>Save Profile</button>
        </>)}

        {/* Lesson Plan Defaults */}
        {sectionHeader("\ud83d\udccb Lesson Plan Defaults","defaults",["defaultTerm"])}
        {sectionBody("defaults",<>
          <div>
            <span style={labelStyle}>Default Term</span>
            <select value={settings.defaultTerm} onChange={e=>update("defaultTerm",e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
              {TERMS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </>)}

        {/* Data Management */}
        {sectionHeader("\ud83d\udce6 Data Management","data",[])}
        {sectionBody("data",<>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <span style={labelStyle}>Export / Import</span>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>{const blob=new Blob([JSON.stringify(savedPlans,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`lesson-plans-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}} style={btnStyle("#0369a1")}>{"\ud83d\udce4"} Export All Plans</button>
                <label style={{...btnStyle("#16a34a"),display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                  {"\ud83d\udce5"} Import Plans
                  <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(Array.isArray(data)){const merged=[...savedPlans];let added=0;data.forEach(p=>{if(!merged.find(m=>m.id===p.id)){merged.push(p);added++;}});setSavedPlans(merged);persist(merged);setAppModal({type:"alert",icon:"\u2705",title:"Import Complete",message:`Imported ${added} new plan(s). ${data.length-added} duplicate(s) skipped.`});}else{setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Invalid File",message:"Expected a JSON array of lesson plans."});}}catch{setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Parse Error",message:"Could not parse the file as JSON."});}};reader.readAsText(f);e.target.value="";}}/>
                </label>
              </div>
            </div>
            <div>
              <span style={labelStyle}>Backup</span>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                <button onClick={async()=>{await doBackup();setAppModal({type:"alert",icon:"\u2705",title:"Backup Created",message:`Backup saved to session ${backupSessionId}`});}} style={btnStyle("#7c3aed")}>{"\ud83d\udcbe"} Backup to Server</button>
                <button onClick={()=>{const backup={plans:savedPlans,settings,schoolHolidays,holidayLabels,pacingGuideData:pacingData,pacingUndoStack,pacingRedoStack,exportDate:new Date().toISOString()};const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;const now=new Date();a.download=`lesson-planner-backup-${now.toISOString().slice(0,10)}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}.json`;a.click();URL.revokeObjectURL(url);setLastBackupTime(now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));}} style={btnStyle("#6b7280")}>{"\ud83d\udcc1"} Download Backup</button>
                <label style={{...btnStyle("#b45309"),display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                  {"\ud83d\udd04"} Restore from File
                  <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Restore Backup?",message:"This will replace ALL your current data (plans, settings, holidays) with the backup. This cannot be undone.",confirmLabel:"Restore",confirmColor:"#dc2626",onConfirm:()=>restoreData(data)});}catch{setAppModal({type:"alert",icon:"\u26a0\ufe0f",title:"Parse Error",message:"Could not parse the backup file."});}};reader.readAsText(f);e.target.value="";}}/>
                </label>
              </div>
              <button onClick={browseServerBackups} style={btnStyle("#0369a1")}>{"\ud83d\udce6"} Browse Server Backups</button>
              {lastBackupTime&&<div style={{fontSize:12,color:T.textMuted,marginTop:8}}>Last backup: {lastBackupTime}</div>}
            </div>
            <div>
              <span style={labelStyle}>Auto-Backup Settings</span>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={settings.autoBackupEnabled} onChange={e=>update("autoBackupEnabled",e.target.checked)}/> Enable auto-backup
                </label>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div>
                  <span style={{fontSize:12,color:T.textMuted}}>Interval (min)</span>
                  <select value={settings.backupInterval} onChange={e=>update("backupInterval",Number(e.target.value))} style={{...inputStyle,width:80}}>
                    {[15,30,40,60].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <span style={{fontSize:12,color:T.textMuted}}>Max per session</span>
                  <input type="number" min={1} max={100} value={settings.maxBackupsPerSession} onChange={e=>update("maxBackupsPerSession",Number(e.target.value))} style={{...inputStyle,width:80}}/>
                </div>
                <div>
                  <span style={{fontSize:12,color:T.textMuted}}>Max sessions</span>
                  <input type="number" min={1} max={50} value={settings.maxSessions} onChange={e=>update("maxSessions",Number(e.target.value))} style={{...inputStyle,width:80}}/>
                </div>
              </div>
            </div>
          </div>
        </>)}

        {/* Notifications */}
        {sectionHeader("\ud83d\udd14 Notifications","notifications",["showAutoSaveIndicator"])}
        {sectionBody("notifications",<>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,cursor:"pointer"}}>
            <input type="checkbox" checked={settings.showAutoSaveIndicator} onChange={e=>update("showAutoSaveIndicator",e.target.checked)}/> Show "Changes are auto-saved" indicator
          </label>
        </>)}

        {/* Global Reset */}
        <div style={{marginTop:16,padding:18,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,textAlign:"center"}}>
          <button onClick={()=>{setAppModal({type:"confirm",icon:"\u26a0\ufe0f",title:"Reset All Settings?",message:"This will reset ALL settings to their defaults.\n\nYour API key will be cleared.\nYour lesson plans and holidays will NOT be affected.",confirmLabel:"Reset All",confirmColor:"#dc2626",onConfirm:()=>{setSettings({...DEFAULT_SETTINGS});setDraftProfile({teacherName:DEFAULT_SETTINGS.teacherName,schoolName:DEFAULT_SETTINGS.schoolName,location:DEFAULT_SETTINGS.location});setDraftKey("");}});}} style={{...btnStyle("#dc2626"),padding:"10px 32px",fontSize:14}}>Reset All Settings to Defaults</button>
        </div>

      </div>
    </div>
  );
}
