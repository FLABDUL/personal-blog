import masterCv from "../../content/cv/master.json"
import cvModel from "../../content/cv/model"

export const {
  education,
  engineeringWork,
  impact,
  jumpLinks,
  overview,
  profile,
  skills,
  universityLeadership,
} = masterCv

export const experience = cvModel.hydrateProfessionalExperience(masterCv)
export const development = masterCv.professionalDevelopment

export default masterCv
