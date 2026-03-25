"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("candidate_exams", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      /* =====================
         RELATIONS
      ====================== */

      candidateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "candidates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      examId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "exams",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      attemptNo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      /* =====================
         TOKEN & ACCESS
      ====================== */

      examToken: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      tokenExpiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      /* =====================
         EXAM STATUS
      ====================== */

      examStatus: {
        type: Sequelize.ENUM(
          "Assigned",
          "In progress",
          "Completed",
          "Expired",
          "Disqualified",
        ),
        allowNull: false,
        defaultValue: "Assigned",
      },

      /* =====================
         TIMELINE
      ====================== */

      mailSentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      submittedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      /* =====================
         SUBMISSION META
      ====================== */

      submissionType: {
        type: Sequelize.ENUM("AUTO", "MANUAL"),
        allowNull: true,
      },

      /* =====================
         SYSTEM
      ====================== */

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ),
      },
    });

    /* =====================
       INDEXES
    ====================== */

    await queryInterface.addIndex("candidate_exams", ["candidateId"]);
    await queryInterface.addIndex("candidate_exams", ["examId"]);
    await queryInterface.addIndex("candidate_exams", ["examToken"], {
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("candidate_exams");

    // ENUM cleanup (important for MySQL)
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_candidate_exams_examStatus;",
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_candidate_exams_submissionType;",
    );
  },
};
